import { NextRequest, NextResponse } from "next/server";
import { designIdeasService } from "@/features/ai-studio/design-ideas.service";
import type { TelegramApprovalAction } from "@/features/shared/types";

/** Actions supported in this slice — `edit`/`regenerate` are a follow-up increment (see designIdeaStateMachine.ts). */
const SUPPORTED_ACTIONS: TelegramApprovalAction[] = ["approve", "reject", "favorite", "publish"];

/**
 * POST /api/webhooks/n8n/ai-studio/idea-action
 * Called by the `telegram-fb-post-workflow.json` "Idea Action → 7alm" node
 * when the admin presses an inline-keyboard button on a design-idea
 * approval card (`callback_query.data = "ais:<action>:<ideaId>"`).
 *
 * Runs `designIdeaStateMachine` via `design-ideas.service.ts#applyAction`,
 * writes `design_ideas.status` + `telegram_approval_logs`, and on a
 * successful `publish` inserts the linked `products` row.
 *
 * Security: validates `N8N_WEBHOOK_SECRET`, same mechanism as the existing
 * `/api/webhooks/n8n/order-action` route — header `x-webhook-secret` or a
 * `?secret=` query param.
 *
 * Always responds HTTP 200 for a reached business-logic outcome (including
 * an invalid transition) with `{success:false, error}` — never a 4xx for
 * that case — so the n8n `httpRequest` node (`neverError:true`) can branch
 * on the JSON body exactly like the whatsapp "Call 7alm API" node does.
 * Only a missing/invalid shared secret returns 401, matching
 * `order-action`'s own convention.
 *
 * Expected body: { ideaId: string, action: string, telegramUserId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const secret =
      request.headers.get("x-webhook-secret") ||
      request.nextUrl.searchParams.get("secret");
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET;

    if (!expectedSecret || !secret || secret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const ideaId: string | undefined = body?.ideaId;
    const action: string | undefined = body?.action;
    const telegramUserId: string | null = body?.telegramUserId ?? null;

    if (!ideaId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing ideaId or action" },
        { status: 200 }
      );
    }

    if (!SUPPORTED_ACTIONS.includes(action as TelegramApprovalAction)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported action '${action}'. Only approve/reject/favorite/publish are implemented in this slice.`,
        },
        { status: 200 }
      );
    }

    const result = await designIdeasService.applyAction(
      ideaId,
      action as "approve" | "reject" | "favorite" | "publish",
      telegramUserId
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("POST /api/webhooks/n8n/ai-studio/idea-action error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 200 }
    );
  }
}
