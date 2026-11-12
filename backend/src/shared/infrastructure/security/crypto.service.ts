import { Inject, Injectable } from "@nestjs/common";
import crypto from "node:crypto";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function decodeKey(raw: string): Buffer {
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length === KEY_LENGTH * 2) return Buffer.from(raw, "hex");
  const b64 = Buffer.from(raw, "base64");
  if (b64.length === KEY_LENGTH) return b64;
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

/** AES-256-GCM for stored OAuth tokens; payload format `iv:authTag:ciphertext` (base64). */
@Injectable()
export class CryptoService {
  constructor(@Inject(ENV) private readonly env: Env) {}

  private key(): Buffer {
    const raw = this.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
    if (!raw) throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY is not set");
    return decodeKey(raw);
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key(), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return [iv, cipher.getAuthTag(), ciphertext].map((b) => b.toString("base64")).join(":");
  }

  decrypt(payload: string): string {
    const parts = payload.split(":");
    if (parts.length !== 3) throw new Error("Invalid encrypted payload format");
    const [iv, tag, data] = parts.map((p) => Buffer.from(p, "base64"));
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  }
}

/** Constant-time string comparison. */
export function safeEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** HMAC-SHA256 hex digest. */
export function hmacSha256Hex(secret: string, data: Buffer | string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}
