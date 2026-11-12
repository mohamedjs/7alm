/** Key/value cache + idempotency port (Redis in infrastructure). */
export const CACHE = Symbol("CACHE");
export interface Cache {
  getJson<T>(key: string): Promise<T | null>;
  setJson(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  delByPrefix(prefix: string): Promise<void>;
  /** True the first time `key` is seen within the TTL. */
  firstTime(key: string, ttlSeconds: number): Promise<boolean>;
  release(key: string): Promise<void>;
}
