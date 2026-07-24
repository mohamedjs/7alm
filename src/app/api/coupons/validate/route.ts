import { NextRequest, NextResponse } from "next/server";
import { couponsService } from "@/features/coupons/coupons.service";
import { customerService } from "@/features/customers/customers.service";

/**
 * POST /api/coupons/validate
 * Public — live checkout preview. Body: `{ code, subtotal, shippingCost, phone? }`.
 *
 * If `phone` is given, the matching customer (if any) is resolved so
 * per-customer/first-order rules can be previewed; otherwise only the
 * customer-independent rules (active/date window/min order/usage limit)
 * are checked. This endpoint is a PREVIEW ONLY — the authoritative,
 * full check (including per-customer/first-order/usage limits) always
 * re-runs server-side at order creation, since state can change between
 * preview and submit (e.g. the coupon hits its usage limit).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = typeof body.code === "string" ? body.code : "";
    const subtotal = Number(body.subtotal);
    const shippingCost = Number(body.shippingCost) || 0;

    if (!code.trim()) {
      return NextResponse.json(
        { success: false, error: "Coupon code is required" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(subtotal) || subtotal < 0) {
      return NextResponse.json(
        { success: false, error: "A valid subtotal is required" },
        { status: 400 }
      );
    }

    let customerId: string | undefined;
    if (typeof body.phone === "string" && body.phone.trim()) {
      const customer = await customerService.findByPhone(body.phone.trim());
      customerId = customer?.id;
    }

    const result = await couponsService.validateAndApply({
      code,
      subtotal,
      shippingCost,
      customerId,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("POST /api/coupons/validate error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate coupon" },
      { status: 500 }
    );
  }
}
