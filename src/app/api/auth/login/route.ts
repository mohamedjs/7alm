import { NextRequest, NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/auth";

/**
 * POST /api/auth/login
 * Admin login endpoint — authenticates via Supabase Auth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.email || !body.password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error || !data.session) {
      return NextResponse.json(
        { success: false, error: error?.message || "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify the user is an admin
    const { data: admin, error: adminError } = await supabaseAuth
      .from("admins")
      .select("id, email, full_name")
      .eq("id", data.user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        { success: false, error: "You are not authorized as an admin" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: {
          id: admin.id,
          email: admin.email,
          full_name: admin.full_name,
        },
      },
    });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
