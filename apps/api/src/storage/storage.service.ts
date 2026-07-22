import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createReadStream, existsSync, mkdirSync, promises as fs } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * StorageService — object storage abstraction over Cloudflare R2 / AWS S3
 * (both S3-compatible) with a local-filesystem driver for development.
 *
 * Used for product images uploaded via the admin panel and for AUTO_FILE
 * product deliveries (downloadable goods). Signed URLs gate private downloads.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client | null = null;
  private readonly driver: "r2" | "s3" | "local";
  private readonly bucket: string | null;
  private readonly publicBaseUrl: string | null;
  private readonly localRoot = resolve(process.cwd(), "storage");

  constructor(private readonly config: ConfigService) {
    this.driver = this.config.get("storage.driver") ?? "local";
    this.bucket = this.config.get<string | null>("storage.bucket") ?? null;
    this.publicBaseUrl = this.config.get<string | null>("storage.publicBaseUrl") ?? null;
  }

  onModuleInit(): void {
    if (this.driver === "local") {
      if (!existsSync(this.localRoot)) mkdirSync(this.localRoot, { recursive: true });
      this.logger.log(`Storage: local driver at ${this.localRoot}`);
      return;
    }

    const endpoint = this.config.get<string | null>("storage.endpoint");
    const region = this.config.get<string>("storage.region") ?? "auto";
    const accessKeyId = this.config.get<string | null>("storage.accessKeyId");
    const secretAccessKey = this.config.get<string | null>("storage.secretAccessKey");

    if (!accessKeyId || !secretAccessKey || !this.bucket) {
      this.logger.warn(`Storage driver "${this.driver}" selected but credentials incomplete`);
      return;
    }

    this.client = new S3Client({
      region,
      endpoint: endpoint ?? undefined,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: this.driver === "r2" ? true : undefined,
    });
    this.logger.log(`Storage: ${this.driver} driver, bucket ${this.bucket}`);
  }

  get isRemote(): boolean {
    return this.driver !== "local" && this.client !== null;
  }

  /** Stores an object and returns its key. */
  async put(
    body: Buffer,
    contentType: string,
    prefix = "uploads",
  ): Promise<{ key: string; url: string }> {
    const ext = contentType.split("/")[1]?.split("+")[0] ?? "bin";
    const key = `${prefix}/${new Date().getFullYear()}/${randomUUID()}.${ext}`;

    if (this.isRemote && this.client) {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket!,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    } else {
      const full = join(this.localRoot, key);
      mkdirSync(join(full, ".."), { recursive: true });
      await fs.writeFile(full, body);
    }
    return { key, url: this.publicUrl(key) };
  }

  /** Public URL for an object (CDN base for remote, API route for local). */
  publicUrl(key: string): string {
    if (this.publicBaseUrl) return `${this.publicBaseUrl.replace(/\/$/, "")}/${key}`;
    return `/api/v1/files/${encodeURIComponent(key)}`;
  }

  /** Time-limited signed URL for private downloads (AUTO_FILE deliveries). */
  async signedDownloadUrl(key: string, expiresSeconds = 3600): Promise<string> {
    if (this.isRemote && this.client) {
      return getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.bucket!, Key: key }),
        { expiresIn: expiresSeconds },
      );
    }
    // Local driver: served through an API route (auth-checked at request time).
    return this.publicUrl(key);
  }

  async getLocalStream(key: string) {
    const full = join(this.localRoot, key);
    if (!existsSync(full)) return null;
    return createReadStream(full);
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.isRemote && this.client) {
        await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket!, Key: key }));
      } else {
        const full = join(this.localRoot, key);
        if (existsSync(full)) await fs.unlink(full);
      }
    } catch (err) {
      this.logger.warn(`Failed to delete ${key}: ${(err as Error).message}`);
    }
  }
}
