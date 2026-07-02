"use client";

import { Provider } from "react-redux";
import { useEffect } from "react";
import { store } from "./store";
import { useAuth } from "@/features/auth/auth.hooks";

/**
 * Inner component that hydrates auth state from localStorage once on mount,
 * before rendering children. Avoids a flash of the login screen.
 */
function AuthHydrator({ children }: { children: React.ReactNode }) {
  const { hydrate, hydrated } = useAuth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) return null;
  return <>{children}</>;
}

export default function ReduxProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider store={store}>
      <AuthHydrator>{children}</AuthHydrator>
    </Provider>
  );
}
