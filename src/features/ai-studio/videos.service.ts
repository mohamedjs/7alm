import { randomUUID } from "node:crypto";
import { supabase } from "@/lib/supabase";
import { videosRepository } from "@/features/ai-studio/videos.repository";
import type { VideoJob, VideoJobInput } from "@/features/shared/types";

const OPENROUTER_VIDEOS_URL = "https://openrouter.ai/api/v1/videos";
const OPENROUTER_POLL_BASE = "https://openrouter.ai/api/v1/videos";
const VIDEO_MODEL = "bytedance/seedance-2.0";
const STORAGE_BUCKET = "7alm";
const STORAGE_PREFIX = "ai-studio/videos";

/**
 * Same host-allowlist guard as images.service.ts — we never fetch the URL
 * ourselves (OpenRouter does), but we stop an LLM-supplied URL from pushing
 * arbitrary third-party content through the vendor.
 */
const ALLOWED_REFERENCE_PREFIX = `${process.env.SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/`;

interface OpenRouterVideoSubmitResponse {
  id: string;
  polling_url: string;
  status: string;
  error?: { message?: string };
}

interface OpenRouterVideoStatusResponse {
  id: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled" | "expired";
  generation_id?: string;
  unsigned_urls?: string[];
  usage?: { cost?: number };
  error?: { message?: string };
}

export interface SubmitVideoResult {
  job: VideoJob;
  /** OpenRouter's polling URL — returned so the caller (n8n tool) can poll if needed. */
  pollingUrl: string;
}

export class VideosService {
  /**
   * Submits a video generation request to OpenRouter and persists the job.
   * Returns immediately — the agent's tool-result channel is one-shot and
   * cannot wait for the (minutes-long) generation. The OpenRouter callback
   * resolves the job; a poll fallback exists for missed callbacks.
   */
  async submit(input: VideoJobInput): Promise<SubmitVideoResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    if (input.previous_video_url && !input.previous_video_url.startsWith(ALLOWED_REFERENCE_PREFIX)) {
      throw new Error("previous_video_url must be a video we host");
    }

    const callbackUrl = process.env.OPENROUTER_VIDEO_CALLBACK_URL;
    if (!callbackUrl) {
      throw new Error("OPENROUTER_VIDEO_CALLBACK_URL is not configured");
    }

    const body: Record<string, unknown> = {
      model: VIDEO_MODEL,
      prompt: input.prompt,
    };
    if (input.previous_video_url) {
      // image-to-video / first-frame mode — see OpenRouter video docs.
      body.frame_images = [
        { type: "image_url", image_url: { url: input.previous_video_url } },
      ];
    }
    if (callbackUrl) {
      body.callback_url = callbackUrl;
    }

    const response = await fetch(OPENROUTER_VIDEOS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as OpenRouterVideoSubmitResponse;
    if (!response.ok || payload.error) {
      throw new Error(payload.error?.message || `OpenRouter returned ${response.status}`);
    }

    const job = await videosRepository.create(input, payload.id);
    console.log(`[ai-studio] video job ${job.id} submitted (openrouter ${payload.id})`);
    return { job, pollingUrl: payload.polling_url };
  }

  /**
   * Polls OpenRouter for a single job's status and updates the row. Used by
   * the poll-fallback endpoint for jobs whose callback never arrived.
   */
  async pollAndUpdate(job: VideoJob): Promise<VideoJob | null> {
    if (!job.openrouter_job_id) {
      return job;
    }
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const response = await fetch(`${OPENROUTER_POLL_BASE}/${job.openrouter_job_id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const status = (await response.json()) as OpenRouterVideoStatusResponse;

    return this.applyStatusUpdate(job.id, status);
  }

  /**
   * Handles an OpenRouter webhook callback. Idempotent — a duplicate
   * callback for an already-terminal job is a no-op.
   */
  async handleCallback(payload: OpenRouterVideoStatusResponse): Promise<VideoJob | null> {
    if (!payload.id) {
      console.error("[ai-studio] video callback missing id:", payload);
      return null;
    }
    const job = await videosRepository.getByOpenrouterJobId(payload.id);
    if (!job) {
      console.warn(`[ai-studio] video callback for unknown openrouter job ${payload.id}`);
      return null;
    }
    // Already terminal — duplicate callback, no-op.
    if (job.status === "completed" || job.status === "failed" || job.status === "cancelled" || job.status === "expired") {
      return job;
    }

    const updated = await this.applyStatusUpdate(job.id, payload);
    if (updated && updated.status === "completed") {
      await this.notifyTelegram(updated);
    }
    return updated;
  }

  /**
   * Applies a status payload to a job row. On `completed`, downloads the
   * video from OpenRouter's unsigned URL and uploads it to Supabase Storage,
   * then stores the public https URL on the row — same URL-not-bytes
   * contract as campaign images (spec 014 §0).
   */
  private async applyStatusUpdate(
    jobId: string,
    status: OpenRouterVideoStatusResponse
  ): Promise<VideoJob | null> {
    const patch: { video_url?: string | null; cost?: number | null; error?: string | null } = {};
    if (status.usage?.cost !== undefined) patch.cost = status.usage.cost;
    if (status.error?.message) patch.error = status.error.message;

    if (status.status === "completed" && status.unsigned_urls?.[0]) {
      try {
        patch.video_url = await this.downloadAndStore(status.unsigned_urls[0]);
      } catch (err) {
        console.error(`[ai-studio] failed to store video for job ${jobId}:`, err);
        return videosRepository.updateStatus(jobId, "failed", {
          error: err instanceof Error ? err.message : "Failed to store video",
        });
      }
    }

    return videosRepository.updateStatus(jobId, status.status, patch);
  }

  /**
   * Downloads the video bytes from OpenRouter's temporary unsigned URL and
   * uploads them to Supabase Storage, returning the public https URL.
   */
  private async downloadAndStore(unsignedUrl: string): Promise<string> {
    const response = await fetch(unsignedUrl);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const path = `${STORAGE_PREFIX}/${randomUUID()}.mp4`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, { contentType: "video/mp4" });

    if (uploadError) {
      console.error("Error uploading generated video:", uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Sends the completed video to the owner's Telegram chat directly via the
   * Bot API. The agent cannot poll, so the callback route is the only place
   * that knows the video is ready. No-op if TELEGRAM_BOT_TOKEN is unset —
   * the job is still marked completed and the dashboard/poll endpoint will
   * surface it.
   */
  private async notifyTelegram(job: VideoJob): Promise<void> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken || !job.telegram_chat_id || !job.video_url) {
      return;
    }

    try {
      const url = `https://api.telegram.org/bot${botToken}/sendVideo`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: job.telegram_chat_id,
          video: job.video_url,
          caption: "فيديو الكامباين جاهز ✅",
          parse_mode: "HTML",
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error(`[ai-studio] telegram sendVideo failed for job ${job.id}:`, text);
      }
    } catch (err) {
      console.error(`[ai-studio] telegram notify error for job ${job.id}:`, err);
    }
  }
}

export const videosService = new VideosService();
