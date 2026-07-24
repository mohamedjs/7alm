import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, extractToken } from "@/lib/auth";
import { couponsService } from "@/features/coupons/coupons.service";
import type { CouponInput, CouponType } from "@/features/shared/types";

const VALID_TYPES: CouponType[] = ["percentage", "fixed", "free_shipping"];

/**
 * PUT /api/admin/coupons/[id]
 * Admin-only — update a coupon.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const body = (await req.json()) as Partial<CouponInput>;
    if (body.type !== undefined && !VALID_TYPES.includes(body.type)) {
      return NextResponse.json(
        { success: false, error: "type must be 'percentage', 'fixed', or 'free_shipping'" },
        { status: 400 }
      );
    }
    if (body.value !== undefined && (typeof body.value !== "number" || body.value < 0)) {
      return NextResponse.json(
        { success: false, error: "value must be a non-negative number" },
        { status: 400 }
      );
    }

    const coupon = await couponsService.updateCoupon(id, body);
    if (!coupon) {
      return NextResponse.json(
        { success: false, error: "Coupon not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: coupon });
  } catch (error) {
    console.error("PUT /api/admin/coupons/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update coupon" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/coupons/[id]
 * Admin-only — delete a coupon.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const ok = await couponsService.deleteCoupon(id);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Failed to delete coupon" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/coupons/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete coupon" },
      { status: 500 }
    );
  }
}
