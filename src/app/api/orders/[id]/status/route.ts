import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/features/orders/orders.service";
import { extractToken, verifyAdmin } from "@/lib/auth";
import type { ShippingProviderName } from "@/features/shared/types";

/**
 * PATCH /api/orders/[id]/status
 * Protected endpoint — admin changes an order's status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get("authorization");
    const token = extractToken(request.headers.get("authorization"));
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const auth = await verifyAdmin(token);
    if (!auth.valid) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 403 }
      );
    }

    let providerName: ShippingProviderName | undefined;
    let newStatus = "approved"; // default for backwards compatibility if needed

    try {
      const body = await request.json();
      if (body.shipping_provider) {
        providerName = body.shipping_provider as ShippingProviderName;
      }
      if (body.status) {
        newStatus = body.status;
      }
    } catch {
      // No body is fine
    }

    const result = await orderService.changeOrderStatus(id, newStatus, providerName);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      trackingId: result.trackingId,
      message: `Order status changed to ${newStatus}`,
    });
  } catch (error) {
    console.error("PATCH /api/orders/[id]/status error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
