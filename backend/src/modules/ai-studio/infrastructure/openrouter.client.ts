import { Inject, Injectable } from "@nestjs/common";
import crypto from "node:crypto";
import { ENV } from "../../../shared/infrastructure/config/config.module";
import type { Env } from "../../../shared/infrastructure/config/env";
import { DomainError } from "../../../shared/domain/domain-error";
import type { VideoStatus } from "../domain/campaign";

export interface VideoStatusPayload {
  id: string;
  status: VideoStatus;
  unsigned_urls?: string[];
  usage?: { cost?: number };
  error?: { message?: string };
}

const BASE = "https://openrouter.ai/api/v1";

@Injectable()
export class OpenRouterClient {
  constructor(@Inject(ENV) private readonly env: Env) {}

  private key() {
    if (!this.env.OPENROUTER_API_KEY) throw DomainError.unavailable("OPENROUTER_API_KEY is not configured");
    return this.env.OPENROUTER_API_KEY;
  }

  async image(prompt: string, referenceUrl?: string | null): Promise<{ bytes: Buffer; contentType: string; cost: number | null }> {
    const body: Record<string, unknown> = { model: this.env.OPENROUTER_IMAGE_MODEL, prompt };
    if (referenceUrl) body.input_references = [{ type: "image_url", image_url: { url: referenceUrl } }];
    const res = await fetch(`${BASE}/images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key()}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    const data = (await res.json().catch(() => ({}))) as { data?: { b64_json?: string; media_type?: string }[]; usage?: { cost?: number }; error?: { message?: string } };
    if (!res.ok || data.error) throw DomainError.unavailable(data.error?.message ?? `OpenRouter returned ${res.status}`);
    const img = data.data?.[0];
    if (!img?.b64_json) throw DomainError.unavailable("OpenRouter returned no image data");
    return { bytes: Buffer.from(img.b64_json, "base64"), contentType: img.media_type || "image/png", cost: data.usage?.cost ?? null };
  }

  async submitVideo(prompt: string, frameUrl?: string | null): Promise<{ id: string; pollingUrl: string }> {
    if (!this.env.OPENROUTER_VIDEO_CALLBACK_URL) throw DomainError.unavailable("OPENROUTER_VIDEO_CALLBACK_URL is not configured");
    const body: Record<string, unknown> = { model: this.env.OPENROUTER_VIDEO_MODEL, prompt, callback_url: this.env.OPENROUTER_VIDEO_CALLBACK_URL };
    if (frameUrl) body.frame_images = [{ type: "image_url", image_url: { url: frameUrl } }];
    const res = await fetch(`${BASE}/videos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key()}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; polling_url?: string; error?: { message?: string } };
    if (!res.ok || data.error || !data.id) throw DomainError.unavailable(data.error?.message ?? `OpenRouter returned ${res.status}`);
    return { id: data.id, pollingUrl: data.polling_url ?? `${BASE}/videos/${data.id}` };
  }

  async pollVideo(id: string): Promise<VideoStatusPayload> {
    const res = await fetch(`${BASE}/videos/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${this.key()}` }, signal: AbortSignal.timeout(30_000) });
    return (await res.json()) as VideoStatusPayload;
  }

  async download(url: string): Promise<Buffer> {
    const res = await fetch(url, { signal: AbortSignal.timeout(300_000) });
    if (!res.ok) throw new Error(`Failed to download video: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  /** `X-OpenRouter-Signature: t=<unix>,v1=<hex hmac of "t,rawBody">`, 5-minute tolerance. */
  verifySignature(rawBody: Buffer | undefined, header: string | undefined): boolean {
    const secret = this.env.OPENROUTER_WEBHOOK_SECRET;
    if (!secret) return true; // unsigned callbacks accepted only when no secret is configured (documented)
    if (!rawBody || !header) return false;
    const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2) as [string, string]));
    const t = Number(parts.t);
    if (!parts.v1 || !Number.isFinite(t) || Math.floor(Date.now() / 1000) - t > 300) return false;
    const expected = crypto.createHmac("sha256", secret).update(`${parts.t},${rawBody.toString("utf8")}`).digest("hex");
    return expected.length === parts.v1.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  }

  async telegramVideo(chatId: string, videoUrl: string) {
    if (!this.env.TELEGRAM_BOT_TOKEN) return;
    await fetch(`https://api.telegram.org/bot${this.env.TELEGRAM_BOT_TOKEN}/sendVideo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, video: videoUrl, caption: "فيديو الكامباين جاهز ✅" }),
      signal: AbortSignal.timeout(30_000),
    }).catch(() => undefined);
  }
}
