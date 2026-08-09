import { supabase } from "@/lib/supabase";
import type { VideoJob, VideoJobInput, VideoJobStatus } from "@/features/shared/types";

/**
 * Repository for the `ai_video_jobs` table (spec 015). Each row is one
 * asynchronous video generation request submitted to OpenRouter on the
 * Telegram marketing agent's behalf. The row is created on submit and
 * resolved by the OpenRouter callback (or the poll fallback).
 */
export class VideosRepository {
  async create(input: VideoJobInput, openrouterJobId: string): Promise<VideoJob> {
    const { data, error } = await supabase
      .from("ai_video_jobs")
      .insert({
        prompt: input.prompt,
        previous_video_url: input.previous_video_url ?? null,
        campaign_id: input.campaign_id ?? null,
        telegram_chat_id: input.telegram_chat_id ?? null,
        openrouter_job_id: openrouterJobId,
        status: "pending",
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error creating video job:", error);
      throw error;
    }
    return data;
  }

  async getById(id: string): Promise<VideoJob | null> {
    const { data, error } = await supabase
      .from("ai_video_jobs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching video job:", error);
      throw error;
    }
    return data;
  }

  async getByOpenrouterJobId(openrouterJobId: string): Promise<VideoJob | null> {
    const { data, error } = await supabase
      .from("ai_video_jobs")
      .select("*")
      .eq("openrouter_job_id", openrouterJobId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching video job by openrouter id:", error);
      throw error;
    }
    return data;
  }

  async listByStatus(status: VideoJobStatus): Promise<VideoJob[]> {
    const { data, error } = await supabase
      .from("ai_video_jobs")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error listing video jobs:", error);
      throw error;
    }
    return data ?? [];
  }

  /**
   * Jobs still pending/in_progress older than `olderThanMinutes`. Used by the
   * poll-fallback endpoint so an n8n scheduled workflow can sweep jobs whose
   * OpenRouter callback never arrived.
   */
  async listStale(olderThanMinutes: number): Promise<VideoJob[]> {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
    const { data, error } = await supabase
      .from("ai_video_jobs")
      .select("*")
      .in("status", ["pending", "in_progress"])
      .lt("created_at", cutoff)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error listing stale video jobs:", error);
      throw error;
    }
    return data ?? [];
  }

  /**
   * Idempotent status update — only moves the row forward. A callback
   * arriving twice for the same terminal status is a no-op.
   */
  async updateStatus(
    id: string,
    status: VideoJobStatus,
    patch: { video_url?: string | null; cost?: number | null; error?: string | null } = {}
  ): Promise<VideoJob | null> {
    const update: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (patch.video_url !== undefined) update.video_url = patch.video_url;
    if (patch.cost !== undefined) update.cost = patch.cost;
    if (patch.error !== undefined) update.error = patch.error;
    if (status === "completed" || status === "failed" || status === "cancelled" || status === "expired") {
      update.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("ai_video_jobs")
      .update(update)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Error updating video job status:", error);
      throw error;
    }
    return data;
  }
}

export const videosRepository = new VideosRepository();
