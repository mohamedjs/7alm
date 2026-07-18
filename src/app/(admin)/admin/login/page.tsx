"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/auth.hooks";
import LoginForm from "@/components/admin/auth/LoginForm";

/**
 * Dedicated login route the middleware redirects unauthenticated visitors to.
 *
 * Reaching this page means the middleware rejected (or found no) auth cookie,
 * so any client-side session in Redux/localStorage is stale — purge it once
 * instead of trusting it, then let the admin sign in again. Navigation to the
 * dashboard happens inside LoginForm after a successful login.
 */
export default function AdminLoginPage() {
  const { isAuthenticated, logout } = useAuth();
  const purgedStale = useRef(false);

  useEffect(() => {
    if (!purgedStale.current) {
      purgedStale.current = true;
      if (isAuthenticated) logout();
    }
  }, [isAuthenticated, logout]);

  return <LoginForm />;
}
