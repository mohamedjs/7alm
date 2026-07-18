import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/features/orders/orders.service";
import { requireN8nAccess } from "@/lib/n8n-auth";

/**
 * GET /api/n8n/orders/awaiting-confirmation?phone=2010xxxxxxxx
 * Called by the n8n order-confirmation workflow to resolve which order a
 * WhatsApp sender is confirming or cancelling: returns the sender's latest
 * order with status 'approved' (i.e. awaiting the customer's confirmation).
 */
export async function GET(request: NextRequest) {
  const unauthorizedResponse = requireN8nAccess(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const phone = request.nextUrl.searchParams.get("phone");
    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Missing phone parameter" },
        { status: 400 }
      );
    }

    const order = await orderService.getOrderAwaitingConfirmation(phone);
    if (!order) {
      return NextResponse.json(
        { success: false, error: "No order awaiting confirmation" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        productName: order.product?.name || null,
        totalPrice: order.total_price,
        quantity: order.quantity,
      },
    });
  } catch (error) {
    console.error("GET /api/n8n/orders/awaiting-confirmation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
