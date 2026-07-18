"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth.hooks";
import LoginForm from "@/components/admin/auth/LoginForm";

/**
 * Dedicated login route the middleware redirects unauthenticated visitors to.
 * Once credentials are accepted (cookie + Redux state set), sends the admin
 * to the dashboard.
 */
export default function AdminLoginPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.replace("/admin");
  }, [isAuthenticated, router]);

  if (isAuthenticated) return null;
  return <LoginForm />;
}
