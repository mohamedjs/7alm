import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { whatsappService } from "@/features/whatsapp/whatsapp.service";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(adminId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(adminId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(adminId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params;
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        { success: false, error: "Not an admin" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await whatsappService.getMessages(customerId, page, limit);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Messages GET Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params;
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        { success: false, error: "Not an admin" },
        { status: 403 }
      );
    }

    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Max 10 messages per minute." },
        { status: 429 }
      );
    }

    const body = await req.json();

    if (!body.body || typeof body.body !== "string" || body.body.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Message body is required" },
        { status: 400 }
      );
    }

    if (body.body.length > 4096) {
      return NextResponse.json(
        { success: false, error: "Message body exceeds 4096 characters" },
        { status: 400 }
      );
    }

    const message = await whatsappService.sendMessage(
      customerId,
      user.id,
      body.body.trim()
    );

    return NextResponse.json({ success: true, data: message });
  } catch (error: any) {
    console.error("Message POST Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
