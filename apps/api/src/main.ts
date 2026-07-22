import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger, LoggerErrorInterceptor } from "nestjs-pino";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(Logger);
  app.useLogger(logger);
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  const config = app.get(ConfigService);

  // --- Security ------------------------------------------------------------
  app.use(
    helmet({
      contentSecurityPolicy: false, // API only — no HTML responses to protect
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.enableCors({
    origin: config.getOrThrow("cors.origins"),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // --- API shape -------------------------------------------------------------
  app.setGlobalPrefix("api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableShutdownHooks();

  // --- Swagger ---------------------------------------------------------------
  if (config.get<boolean>("swagger.enabled")) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("7MZ Store API")
      .setDescription(
        "REST API for the 7MZ Store Telegram Mini App — catalog, orders, wallet, payments, growth, and admin operations.",
      )
      .setVersion("1.0")
      .addBearerAuth(
        { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        "access-token",
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document, {
      customSiteTitle: "7MZ Store API Docs",
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
    });
  }

  const port = config.getOrThrow<number>("port");
  await app.listen(port, "0.0.0.0");
  logger.log(`7MZ Store API listening on :${port}`, "Bootstrap");
}

void bootstrap();
