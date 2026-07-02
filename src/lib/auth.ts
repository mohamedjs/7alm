import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Auth client for admin authentication.
 * Uses the service role key on the server side for auth operations.
 */
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Verify a JWT token from the request and check if the user is an admin
 */
export async function verifyAdmin(token: string): Promise<{
  valid: boolean;
  userId?: string;
  error?: string;
}> {
  try {
    const {
      data: { user },
      error,
    } = await supabaseAuth.auth.getUser(token);

    if (error || !user) {
      return { valid: false, error: "Invalid token" };
    }

    // Check if user exists in admins table
    const { data: admin, error: adminError } = await supabaseAuth
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .single();

    if (adminError || !admin) {
      return { valid: false, error: "User is not an admin" };
    }

    return { valid: true, userId: user.id };
  } catch {
    return { valid: false, error: "Authentication failed" };
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}
