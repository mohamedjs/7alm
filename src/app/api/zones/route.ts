import { NextResponse } from "next/server";
import { geoService } from "@/features/geo/geo.service";

/**
 * GET /api/zones
 * Public endpoint — returns all zones for the landing page dropdown
 */
export async function GET() {
  try {
    const zones = await geoService.getZonesForDropdown();
    return NextResponse.json({ success: true, data: zones });
  } catch (error) {
    console.error("GET /api/zones error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch zones" },
      { status: 500 }
    );
  }
}
