import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/features/orders/orders.service";
import type { WhatsAppOrderAction } from "@/features/shared/types";

/**
 * POST /api/webhooks/n8n/order-action
 * Called by n8n when a customer responds to a WhatsApp order confirmation
 * message by pressing the "Accept" or "Cancel" button.
 *
 * Security: Validates the N8N_WEBHOOK_SECRET.
 *
 * Expected payload:
 * {
 *   "orderId": "uuid",
 *   "action": "confirm" | "cancel"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate webhook secret
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

    const body: WhatsAppOrderAction = await request.json();

    if (!body.orderId || !body.action) {
      return NextResponse.json(
        { success: false, error: "Missing orderId or action" },
        { status: 400 }
      );
    }

    if (!["confirm", "cancel"].includes(body.action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'confirm' or 'cancel'" },
        { status: 400 }
      );
    }

    let result: { success: boolean; trackingId?: string; error?: string };

    if (body.action === "confirm") {
      result = await orderService.confirmOrder(body.orderId);
    } else {
      result = await orderService.cancelOrder(body.orderId);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      action: body.action,
      trackingId: result.trackingId,
      message:
        body.action === "confirm"
          ? "Order confirmed and shipping initiated"
          : "Order cancelled successfully",
    });
  } catch (error) {
    console.error("POST /api/webhooks/n8n/order-action error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
