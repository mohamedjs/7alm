import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";
import type { Cache } from "../../application/cache.port";

@Injectable()
export class RedisService implements OnModuleDestroy, Cache {
  readonly client: Redis;

  constructor(@Inject(ENV) env: Env) {
    this.client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: false });
  }

  /**
   * Idempotency guard: returns true the first time `key` is seen within
   * `ttlSeconds`, false on every repeat. Meta and shipping providers retry
   * deliveries, so every handler that has side effects calls this first.
   */
  async firstTime(key: string, ttlSeconds: number): Promise<boolean> {
    const res = await this.client.set(key, "1", "EX", ttlSeconds, "NX");
    return res === "OK";
  }

  async release(key: string): Promise<void> {
    await this.client.del(key);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  }

  async delByPrefix(prefix: string): Promise<void> {
    let cursor = "0";
    do {
      const [next, keys] = await this.client.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 200);
      cursor = next;
      if (keys.length) await this.client.del(...keys);
    } while (cursor !== "0");
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  async onModuleDestroy() {
    this.client.disconnect();
  }
}
