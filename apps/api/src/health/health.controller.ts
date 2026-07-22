import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  private readonly bootedAt = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Service health with dependency checks" })
  async health() {
    const [db, cache] = await Promise.all([this.checkDatabase(), this.redis.ping()]);
    const healthy = db && cache;

    return {
      status: healthy ? "ok" : "degraded",
      uptimeSeconds: Math.floor((Date.now() - this.bootedAt) / 1000),
      checks: {
        database: db ? "up" : "down",
        redis: cache ? "up" : "down",
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
