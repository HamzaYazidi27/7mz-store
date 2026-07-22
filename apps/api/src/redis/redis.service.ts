import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

/**
 * In-memory fallback store — a TTL Map used when Redis is unreachable.
 * Keeps local development and CI running with real caching semantics and
 * no external dependency, while production uses Redis via Docker Compose.
 */
class MemoryStore {
  private readonly data = new Map<string, { value: string; expiresAt: number | null }>();
  private readonly locks = new Map<string, { token: string; expiresAt: number }>();

  private alive(key: string): boolean {
    const entry = this.data.get(key);
    if (!entry) return false;
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.data.delete(key);
      return false;
    }
    return true;
  }

  get(key: string): string | null {
    return this.alive(key) ? this.data.get(key)!.value : null;
  }

  set(key: string, value: string, ttlSeconds?: number): void {
    this.data.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  del(keys: string[]): void {
    keys.forEach((key) => this.data.delete(key));
  }

  delByPattern(pattern: string): void {
    const rx = new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
    for (const key of this.data.keys()) if (rx.test(key)) this.data.delete(key);
  }

  acquireLock(key: string, ttlMs: number): (() => void) | null {
    const existing = this.locks.get(key);
    if (existing && existing.expiresAt > Date.now()) return null;
    const token = `${Date.now()}-${Math.random()}`;
    this.locks.set(key, { token, expiresAt: Date.now() + ttlMs });
    return () => {
      const cur = this.locks.get(key);
      if (cur?.token === token) this.locks.delete(key);
    };
  }
}

/**
 * RedisService — caching, distributed locks, and ephemeral storage.
 * Prefers a real Redis connection; transparently falls back to an in-memory
 * store when Redis is unavailable so a missing cache never fails a request.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly memory = new MemoryStore();
  readonly client: Redis;
  private connected = false;
  private warnedOffline = false;

  constructor(config: ConfigService) {
    this.client = new Redis(config.getOrThrow<string>("redis.url"), {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: false,
      // Back off aggressively and cap reconnection attempts to avoid log spam.
      retryStrategy: (times) => (times > 10 ? null : Math.min(times * 500, 5_000)),
      reconnectOnError: () => false,
    });

    this.client.on("ready", () => {
      this.connected = true;
      this.warnedOffline = false;
      this.logger.log("Redis connection established");
    });
    this.client.on("end", () => {
      this.connected = false;
    });
    this.client.on("error", (err) => {
      if (!this.warnedOffline) {
        this.warnedOffline = true;
        this.logger.warn(
          `Redis unavailable (${err.message}) — using in-memory cache fallback`,
        );
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => this.client.disconnect());
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async ping(): Promise<boolean> {
    if (!this.connected) return false;
    try {
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------- JSON API

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const raw = this.connected ? await this.client.get(key) : this.memory.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const raw = JSON.stringify(value);
    try {
      if (this.connected) {
        if (ttlSeconds) await this.client.set(key, raw, "EX", ttlSeconds);
        else await this.client.set(key, raw);
      } else {
        this.memory.set(key, raw, ttlSeconds);
      }
    } catch {
      this.memory.set(key, raw, ttlSeconds);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      if (this.connected) await this.client.del(...keys);
      else this.memory.del(keys);
    } catch {
      this.memory.del(keys);
    }
  }

  /** Deletes all keys matching a glob pattern (SCAN-based, production-safe). */
  async delByPattern(pattern: string): Promise<void> {
    if (!this.connected) {
      this.memory.delByPattern(pattern);
      return;
    }
    try {
      const stream = this.client.scanStream({ match: pattern, count: 200 });
      const batch: string[] = [];
      for await (const keys of stream) {
        batch.push(...(keys as string[]));
        if (batch.length >= 500) await this.client.del(...batch.splice(0));
      }
      if (batch.length > 0) await this.client.del(...batch);
    } catch {
      /* best-effort cache invalidation */
    }
  }

  /** Cache-aside helper: returns the cached value or computes + stores it. */
  async remember<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.getJson<T>(key);
    if (cached !== null) return cached;
    const fresh = await factory();
    await this.setJson(key, fresh, ttlSeconds);
    return fresh;
  }

  /** Simple distributed lock (SET NX PX in Redis, Map-based in fallback). */
  async acquireLock(key: string, ttlMs: number): Promise<(() => Promise<void>) | null> {
    if (!this.connected) {
      const release = this.memory.acquireLock(key, ttlMs);
      return release ? async () => release() : null;
    }
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ok = await this.client.set(`lock:${key}`, token, "PX", ttlMs, "NX").catch(() => null);
    if (!ok) return null;
    return async () => {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end`;
      await this.client.eval(script, 1, `lock:${key}`, token).catch(() => undefined);
    };
  }
}
