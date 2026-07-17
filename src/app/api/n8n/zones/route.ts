import { NextRequest, NextResponse } from "next/server";
import { geoService } from "@/features/geo/geo.service";
import { requireN8nAccess } from "@/lib/n8n-auth";

export async function GET(request: NextRequest) {
  const unauthorizedResponse = requireN8nAccess(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const zones = await geoService.getZonesForDropdown();
    return NextResponse.json({ success: true, data: zones });
  } catch (error) {
    console.error("GET /api/n8n/zones error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch zones" },
      { status: 500 }
    );
  }
}
