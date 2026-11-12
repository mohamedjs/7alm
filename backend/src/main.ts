import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { json, urlencoded } from "express";
import type { IncomingMessage } from "node:http";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { loadEnv } from "./shared/infrastructure/config/env";
import { RedisIoAdapter } from "./modules/realtime/infrastructure/redis-io.adapter";

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, bodyParser: false });
  app.useLogger(app.get(Logger));

  // Keep the raw bytes: Meta signs the exact body (X-Hub-Signature-256).
  const keepRaw = (req: IncomingMessage, _res: unknown, buf: Buffer) => {
    (req as IncomingMessage & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
  };
  app.use(json({ limit: "2mb", verify: keepRaw }));
  app.use(urlencoded({ extended: true, limit: "2mb", verify: keepRaw }));
  app.use(cookieParser());
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.set("trust proxy", 1);
  app.enableCors({ origin: env.CORS_ORIGINS.split(",").map((o) => o.trim()), credentials: true });
  app.setGlobalPrefix("api", { exclude: ["health", "health/ready"] });
  app.useStaticAssets(env.UPLOAD_DIR, { prefix: env.PUBLIC_UPLOAD_BASE, maxAge: "30d", immutable: true });

  const io = new RedisIoAdapter(app, env.REDIS_URL);
  await io.connect();
  app.useWebSocketAdapter(io);

  app.enableShutdownHooks();
  await app.listen(env.PORT, "0.0.0.0");
}

void bootstrap();
