import { NextRequest, NextResponse } from "next/server";
import { requireN8nAccess } from "@/lib/n8n-auth";
import { videosService } from "@/features/ai-studio/videos.service";
import type { VideoJobInput } from "@/features/shared/types";

/**
 * POST /api/n8n/ai-studio/videos
 * n8n-only (x-n8n-access-token) — the Telegram marketing agent's
 * `generate_campaign_video` tool. Submits an asynchronous video generation
 * request to OpenRouter (bytedance/seedance-2.0) and returns immediately
 * with the job id and OpenRouter polling URL.
 *
 * The agent CANNOT poll from inside its tool-result channel (one-shot), so
 * the video is delivered to the owner via the OpenRouter callback
 * (POST /api/webhooks/openrouter/video), which sends a Telegram sendVideo
 * directly. A poll fallback exists at GET /api/n8n/ai-studio/videos/pending
 * for jobs whose callback never arrived.
 *
 * Body: { prompt, previous_video_url?, campaign_id?, telegram_chat_id? }
 *  → { success, job_id, status, polling_url }
 */
export async function POST(req: NextRequest) {
  const authError = requireN8nAccess(req);
  if (authError) return authError;

  try {
    const body = (await req.json()) as Partial<VideoJobInput>;

    if (!body.prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: "prompt is required" },
        { status: 400 }
      );
    }

    // telegram_chat_id is required for the callback to notify the owner.
    // If absent, the job still runs but the owner won't get a push message.
    const input: VideoJobInput = {
      prompt: body.prompt.trim(),
      previous_video_url: body.previous_video_url?.trim() || null,
      campaign_id: body.campaign_id?.trim() || null,
      telegram_chat_id: body.telegram_chat_id?.trim() || null,
    };

    const { job, pollingUrl } = await videosService.submit(input);

    return NextResponse.json({
      success: true,
      job_id: job.id,
      status: job.status,
      polling_url: pollingUrl,
    });
  } catch (error) {
    console.error("POST /api/n8n/ai-studio/videos error:", error);
    const message = error instanceof Error ? error.message : "Failed to submit video job";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
