import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { JwtModule } from "@nestjs/jwt";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";

import { configuration } from "./config/configuration";
import { validateEnv } from "./config/env.validation";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { CryptoModule } from "./crypto/crypto.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CatalogModule } from "./catalog/catalog.module";
import { HomeModule } from "./home/home.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { StorageModule } from "./storage/storage.module";
import { DeliveryModule } from "./delivery/delivery.module";
import { CouponsModule } from "./coupons/coupons.module";
import { WalletModule } from "./wallet/wallet.module";
import { PaymentsModule } from "./payments/payments.module";
import { OrdersModule } from "./orders/orders.module";
import { ReferralsModule } from "./referrals/referrals.module";
import { MissionsModule } from "./missions/missions.module";
import { RewardsModule } from "./rewards/rewards.module";
import { SupportModule } from "./support/support.module";
import { AdminModule } from "./admin/admin.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      load: [configuration],
    }),

    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get("isProduction") ? "info" : "debug",
          transport: config.get("isProduction")
            ? undefined
            : {
                target: "pino-pretty",
                options: { singleLine: true, colorize: true },
              },
          autoLogging: {
            ignore: (req) => req.url?.includes("/health") ?? false,
          },
          redact: ["req.headers.authorization", "req.headers.cookie"],
        },
      }),
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.getOrThrow<number>("throttle.ttl"),
            limit: config.getOrThrow<number>("throttle.limit"),
          },
        ],
      }),
    }),

    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    JwtModule.register({ global: true }),

    PrismaModule,
    RedisModule,
    CryptoModule,
    AuditModule,
    StorageModule,
    DeliveryModule,
    CouponsModule,
    WalletModule,
    PaymentsModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    HomeModule,
    OrdersModule,
    ReferralsModule,
    MissionsModule,
    RewardsModule,
    NotificationsModule,
    SupportModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
