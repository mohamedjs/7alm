import { NextRequest, NextResponse } from "next/server";
import { orderRepository } from "@/features/orders/orders.repository";
import { shippingFactory } from "@/features/shipping/shipping.factory";
import type { ShippingProviderName } from "@/features/shared/types";

/**
 * POST /api/webhooks/shipping
 * Receives status update webhooks from shipping providers (Bosta, ABS, Mylerz).
 *
 * Security: Validates the secret query parameter.
 * Each provider sends different payload formats — we normalize them here.
 */
export async function POST(request: NextRequest) {
  try {
    // Validate webhook secret
    const secret = request.nextUrl.searchParams.get("secret");
    const expectedSecret = process.env.SHIPPING_WEBHOOK_SECRET;

    if (!secret || secret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Determine which provider sent the webhook
    const providerParam = request.nextUrl.searchParams.get("provider") as
      | ShippingProviderName
      | null;

    const body = await request.json();
    const provider = shippingFactory.getProvider(providerParam || "bosta");

    // Extract tracking ID and status based on provider
    let trackingId: string | undefined;
    let providerStatus: string | undefined;

    if (providerParam === "bosta" || !providerParam) {
      // Bosta webhook payload format
      trackingId = body.trackingNumber || body.TrackingNumber;
      providerStatus =
        body.CurrentStatus?.state || body.currentStatus?.state || body.state;
    } else if (providerParam === "abs") {
      // ABS webhook payload format (placeholder)
      trackingId = body.tracking_id;
      providerStatus = body.status;
    } else if (providerParam === "mylerz") {
      // Mylerz webhook payload format (placeholder)
      trackingId = body.tracking_number;
      providerStatus = body.order_status;
    }

    if (!trackingId || !providerStatus) {
      console.warn("Webhook missing tracking ID or status:", body);
      return NextResponse.json(
        { success: false, error: "Missing tracking ID or status" },
        { status: 400 }
      );
    }

    // Map provider status to our internal status
    const internalStatus = provider.mapStatus(providerStatus);

    // Find and update the order
    // We need to find the order by shipping_tracking_id
    const { supabase } = await import("@/lib/supabase");
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("shipping_tracking_id", trackingId)
      .single();

    if (!order) {
      console.warn("No order found for tracking ID:", trackingId);
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    await orderRepository.updateOrderStatus(order.id, internalStatus);

    console.log(
      `Webhook: Order ${order.id} updated to ${internalStatus} (provider: ${providerStatus})`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
