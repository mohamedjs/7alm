import { NextRequest, NextResponse } from "next/server";
import { requireN8nAccess } from "@/lib/n8n-auth";
import { videosRepository } from "@/features/ai-studio/videos.repository";

/**
 * GET /api/n8n/ai-studio/videos/[id]
 * n8n-only — returns the current status of a video job. The agent uses this
 * if it needs to report progress to the owner ("لسه بيتولّد") without
 * waiting for the callback.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireN8nAccess(req);
  if (authError) return authError;

  const { id } = await params;
  const job = await videosRepository.getById(id);
  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: job });
}
