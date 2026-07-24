import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, extractToken } from "@/lib/auth";
import { couponsService } from "@/features/coupons/coupons.service";
import type { CouponInput, CouponType } from "@/features/shared/types";

const VALID_TYPES: CouponType[] = ["percentage", "fixed", "free_shipping"];

/**
 * GET /api/admin/coupons
 * Admin-only — list all coupons.
 */
export async function GET(req: NextRequest) {
  try {
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

    const coupons = await couponsService.getAllCoupons();
    return NextResponse.json({ success: true, data: coupons });
  } catch (error) {
    console.error("GET /api/admin/coupons error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch coupons" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/coupons
 * Admin-only — create a coupon.
 */
export async function POST(req: NextRequest) {
  try {
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
    if (!body.code || typeof body.code !== "string" || !body.code.trim()) {
      return NextResponse.json(
        { success: false, error: "code is required" },
        { status: 400 }
      );
    }
    if (!body.type || !VALID_TYPES.includes(body.type)) {
      return NextResponse.json(
        { success: false, error: "type must be 'percentage', 'fixed', or 'free_shipping'" },
        { status: 400 }
      );
    }
    if (typeof body.value !== "number" || body.value < 0) {
      return NextResponse.json(
        { success: false, error: "value must be a non-negative number" },
        { status: 400 }
      );
    }

    const coupon = await couponsService.createCoupon(body as CouponInput);
    if (!coupon) {
      return NextResponse.json(
        { success: false, error: "Failed to create coupon (code may already exist)" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: coupon });
  } catch (error) {
    console.error("POST /api/admin/coupons error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create coupon" },
      { status: 500 }
    );
  }
}
