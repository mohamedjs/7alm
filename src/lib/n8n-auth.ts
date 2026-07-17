import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN_HEADER = "x-n8n-access-token";

export function requireN8nAccess(request: NextRequest): NextResponse | null {
  const expectedToken = process.env.N8N_API_ACCESS_TOKEN;

  if (!expectedToken) {
    return NextResponse.json(
      { success: false, error: "N8N API access is not configured" },
      { status: 503 }
    );
  }

  const providedToken = request.headers.get(ACCESS_TOKEN_HEADER);
  if (!providedToken) {
    return NextResponse.json(
      { success: false, error: "Missing n8n access token" },
      { status: 401 }
    );
  }

  const expected = Buffer.from(expectedToken);
  const provided = Buffer.from(providedToken);
  const isValid =
    expected.length === provided.length && timingSafeEqual(expected, provided);

  if (!isValid) {
    return NextResponse.json(
      { success: false, error: "Invalid n8n access token" },
      { status: 401 }
    );
  }

  return null;
}
