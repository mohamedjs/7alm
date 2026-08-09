import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { videosService } from "@/features/ai-studio/videos.service";

/**
 * POST /api/webhooks/openrouter/video
 * Receives OpenRouter's `video.generation.completed` / `.failed` callbacks.
 *
 * Authentication: if OPENROUTER_WEBHOOK_SECRET is set, the route verifies
 * the `X-OpenRouter-Signature` header (HMAC-SHA256 of `{t},{rawBody}`).
 * If the secret is unset, the route accepts unsigned callbacks — the only
 * mutation is completing a video job row, and the callback URL is not
 * enumerable. Setting the secret is strongly recommended in production.
 *
 * On `completed`: the service downloads the video, stores it in Supabase
 * Storage, updates the job row, and sends a Telegram sendVideo to the
 * owner's chat (if TELEGRAM_BOT_TOKEN is configured).
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Optional signature verification.
  const secret = process.env.OPENROUTER_WEBHOOK_SECRET;
  if (secret) {
    const signatureHeader = req.headers.get("x-openrouter-signature");
    if (!signatureHeader || !verifyWebhookSignature(rawBody, signatureHeader, secret)) {
      console.warn("[openrouter/video] rejected callback: invalid signature");
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: {
    type?: string;
    data?: {
      id?: string;
      status?: "pending" | "in_progress" | "completed" | "failed" | "cancelled" | "expired";
      generation_id?: string;
      unsigned_urls?: string[];
      usage?: { cost?: number };
      error?: { message?: string };
    };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("[openrouter/video] failed to parse callback body");
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  // OpenRouter wraps the job in `data`. Tolerate a flat payload too.
  const jobData = (payload.data ?? (payload as unknown)) as {
    id?: string;
    status?: "pending" | "in_progress" | "completed" | "failed" | "cancelled" | "expired";
    generation_id?: string;
    unsigned_urls?: string[];
    usage?: { cost?: number };
    error?: { message?: string };
  };
  if (!jobData.id || !jobData.status) {
    console.warn("[openrouter/video] callback missing id/status");
    return NextResponse.json({ success: false, error: "Missing id/status" }, { status: 400 });
  }

  try {
    await videosService.handleCallback(jobData as Parameters<typeof videosService.handleCallback>[0]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[openrouter/video] callback handling error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to handle callback" },
      { status: 500 }
    );
  }
}

const FIVE_MINUTES_IN_SECONDS = 300;

function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  const parts = signatureHeader.split(",");
  const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
  const hash = parts.find((p) => p.startsWith("v1="))?.slice(3);

  if (!timestamp || !hash) return false;

  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (Number.isNaN(age) || age > FIVE_MINUTES_IN_SECONDS) return false;

  const signedPayload = `${timestamp},${rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

  if (expected.length !== hash.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
}
