import { NextRequest, NextResponse } from "next/server";
import { orderRepository } from "@/features/orders/orders.repository";
import type { OrderWithDetails } from "@/features/shared/types";

/**
 * GET /api/webhooks/n8n?secret=xxx&orderId=xxx
 * Called by n8n workflows to fetch order details for composing notification messages.
 *
 * Security: Validates a shared secret (N8N_WEBHOOK_SECRET env var).
 */
export async function GET(request: NextRequest) {
  try {
    // Validate webhook secret
    const secret = request.nextUrl.searchParams.get("secret");
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET;

    if (!expectedSecret || !secret || secret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const orderId = request.nextUrl.searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Missing orderId parameter" },
        { status: 400 }
      );
    }

    const order: OrderWithDetails | null =
      await orderRepository.getOrderById(orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Return a safe subset of order data for n8n
    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        status: order.status,
        customerName: order.customer.full_name,
        customerPhone: order.customer.phone,
        productName: order.product?.name || null,
        productSlug: order.product?.slug || null,
        totalPrice: order.total_price,
        quantity: order.quantity,
        trackingId: order.shipping_tracking_id,
        shippingProvider: order.shipping_provider,
        createdAt: order.created_at,
        address: {
          street: order.address.street_details,
          zone: order.address.zone?.arabic_name || order.address.zone?.english_name,
          city: order.address.zone?.city?.name,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/webhooks/n8n error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webhooks/n8n
 * Reserved for future n8n callbacks (e.g., AI response logging, delivery confirmations).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate webhook secret from header or body
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

    // Log the callback for debugging/future use
    console.log("n8n webhook callback:", JSON.stringify(body));

    return NextResponse.json({ success: true, message: "Received" });
  } catch (error) {
    console.error("POST /api/webhooks/n8n error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
