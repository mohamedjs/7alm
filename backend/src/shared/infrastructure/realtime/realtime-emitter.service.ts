import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Emitter } from "@socket.io/redis-emitter";
import Redis from "ioredis";
import { Inject } from "@nestjs/common";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";
import type { Realtime } from "../../application/realtime.port";

/** Room every authenticated admin socket joins. */
export const ADMIN_ROOM = "admins";

/**
 * Lets any process (the worker included) push socket.io events to browsers:
 * it publishes through Redis, and the api's socket.io Redis adapter delivers.
 */
@Injectable()
export class RealtimeEmitter implements OnModuleDestroy, Realtime {
  private readonly redis: Redis;
  private readonly emitter: Emitter;

  constructor(@Inject(ENV) env: Env) {
    this.redis = new Redis(env.REDIS_URL);
    this.emitter = new Emitter(this.redis);
  }

  toAdmins(event: string, payload: unknown): void {
    this.emitter.to(ADMIN_ROOM).emit(event, payload);
  }

  toRoom(room: string, event: string, payload: unknown): void {
    this.emitter.to(room).emit(event, payload);
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }
}
