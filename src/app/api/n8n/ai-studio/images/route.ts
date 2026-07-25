import { NextRequest, NextResponse } from "next/server";
import { requireN8nAccess } from "@/lib/n8n-auth";
import { imagesService } from "@/features/ai-studio/images.service";

/**
 * POST /api/n8n/ai-studio/images
 * n8n-only — the Telegram agent's `generate_campaign_image` tool. Calls
 * OpenRouter, stores the bytes, and returns ONLY a short public URL: image
 * bytes cannot travel back through an agent's tool-result channel (n8n drops
 * binary, and base64 would poison the conversation memory). See
 * specs/014-campaign-image-generation/spec.md §0.
 *
 * Body: { prompt, previous_image_url? } → { success, url, cost }
 */
export async function POST(req: NextRequest) {
  const authError = requireN8nAccess(req);
  if (authError) return authError;

  try {
    const body = (await req.json()) as { prompt?: string; previous_image_url?: string | null };

    if (!body.prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: "prompt is required" },
        { status: 400 }
      );
    }

    const { url, cost } = await imagesService.generate(
      body.prompt.trim(),
      body.previous_image_url?.trim() || null
    );

    return NextResponse.json({ success: true, url, cost });
  } catch (error) {
    console.error("POST /api/n8n/ai-studio/images error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate image";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
