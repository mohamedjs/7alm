import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/features/orders/orders.service";
import { extractToken, verifyAdmin } from "@/lib/auth";
import type { CreateOrderInput } from "@/features/shared/types";

/**
 * POST /api/orders
 * Public endpoint — creates a new order from the landing page form
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.full_name || !body.phone || !body.zone_id || !body.street_details) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: full_name, phone, zone_id, street_details",
        },
        { status: 400 }
      );
    }

    // Phone validation (Egyptian format)
    const phoneRegex = /^(01)[0-9]{9}$/;
    if (!phoneRegex.test(body.phone.replace(/\s/g, ""))) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    const input: CreateOrderInput = {
      full_name: body.full_name.trim(),
      phone: body.phone.replace(/\s/g, ""),
      email: body.email?.trim() || undefined,
      zone_id: body.zone_id,
      street_details: body.street_details.trim(),
      product_id: body.product_id || undefined,
      quantity: body.quantity || 1,
      platform_source: body.platform_source || undefined,
      ip_address: body.ip_address || undefined,
      ip_country: body.ip_country || undefined,
      ip_city: body.ip_city || undefined,
    };

    const result = await orderService.processNewOrder(input);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, orderId: result.orderId },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders
 * Protected endpoint — returns orders (requires admin auth)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
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

    const status = request.nextUrl.searchParams.get("status");

    let orders;
    if (status === "pending") {
      orders = await orderService.getPendingOrders();
    } else {
      orders = await orderService.getAllOrders();
    }

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
