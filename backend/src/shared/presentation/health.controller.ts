import { Controller, Get, HttpCode, Res } from "@nestjs/common";
import type { Response } from "express";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { RedisService } from "../infrastructure/redis/redis.service";
import { RawResponse } from "../infrastructure/http/envelope.interceptor";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Liveness: the process is up. */
  @Get()
  @RawResponse()
  @HttpCode(200)
  live() {
    return { status: "ok" };
  }

  /** Readiness: dependencies the api needs to serve traffic. */
  @Get("ready")
  @RawResponse()
  async ready(@Res() res: Response) {
    const [db, redis] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      this.redis.ping(),
    ]);
    const ok = db && redis;
    res.status(ok ? 200 : 503).json({ status: ok ? "ok" : "degraded", postgres: db, redis });
  }
}
