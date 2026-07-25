import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, extractToken } from "@/lib/auth";
import { aiStudioService } from "@/features/ai-studio/ai-studio.service";
import type { TrendStatus } from "@/features/shared/types";

const VALID_STATUSES: TrendStatus[] = ["new", "summarized", "used", "archived"];

/**
 * GET /api/admin/ai-studio/trends?status=new
 * Admin-only — list trends, optionally filtered by status.
 */
export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get("authorization"));
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const auth = await verifyAdmin(token);
    if (!auth.valid) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const statusParam = req.nextUrl.searchParams.get("status");
    const status = VALID_STATUSES.includes(statusParam as TrendStatus)
      ? (statusParam as TrendStatus)
      : undefined;

    const trends = await aiStudioService.listTrends(status);
    return NextResponse.json({ success: true, data: trends });
  } catch (error) {
    console.error("GET /api/admin/ai-studio/trends error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch trends" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai-studio/trends
 * Admin-only — manually seed a trend (source is always forced to `manual`).
 * This is how the Design Director gets input while no scraper credentials
 * exist for the other 7 sources (pinterest/etsy/tiktok/instagram/
 * google_trends/reddit/amazon).
 *
 * Body: { raw_signal: object, summary?: string, score?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get("authorization"));
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const auth = await verifyAdmin(token);
    if (!auth.valid) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    if (!body?.raw_signal || typeof body.raw_signal !== "object") {
      return NextResponse.json(
        { success: false, error: "raw_signal (object) is required" },
        { status: 400 }
      );
    }

    const trend = await aiStudioService.recordTrend({
      source: "manual",
      raw_signal: body.raw_signal,
      summary: typeof body.summary === "string" ? body.summary : null,
      score: typeof body.score === "number" ? body.score : null,
    });

    return NextResponse.json({ success: true, data: trend });
  } catch (error) {
    console.error("POST /api/admin/ai-studio/trends error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create trend" },
      { status: 500 }
    );
  }
}
