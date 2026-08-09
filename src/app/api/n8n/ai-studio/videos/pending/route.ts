import { NextRequest, NextResponse } from "next/server";
import { requireN8nAccess } from "@/lib/n8n-auth";
import { videosService } from "@/features/ai-studio/videos.service";
import { videosRepository } from "@/features/ai-studio/videos.repository";

/**
 * GET /api/n8n/ai-studio/videos/pending
 * n8n-only — returns video jobs still in pending/in_progress older than 2
 * minutes, and proactively polls OpenRouter for each one to update status.
 *
 * This is the poll fallback for jobs whose OpenRouter callback never
 * arrived (network blip, misconfigured callback URL, etc.). An n8n
 * scheduled workflow (cron) calls this every few minutes; it is NOT
 * called from the agent's tool channel.
 */
export async function GET(req: NextRequest) {
  const authError = requireN8nAccess(req);
  if (authError) return authError;

  try {
    const stale = await videosRepository.listStale(2);
    const updated = await Promise.allSettled(
      stale.map((job) => videosService.pollAndUpdate(job))
    );

    const results = updated.map((r, i) => ({
      job_id: stale[i].id,
      openrouter_job_id: stale[i].openrouter_job_id,
      outcome:
        r.status === "fulfilled" && r.value
          ? r.value.status
          : "poll_error",
    }));

    return NextResponse.json({ success: true, checked: stale.length, results });
  } catch (error) {
    console.error("GET /api/n8n/ai-studio/videos/pending error:", error);
    const message = error instanceof Error ? error.message : "Failed to poll stale jobs";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
