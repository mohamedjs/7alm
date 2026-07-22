"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  // Read whatever the pre-paint inline script (see (admin)/admin/layout.tsx
  // or (store)/layout.tsx) already applied to <html>, rather than
  // re-reading localStorage — this keeps the toggle UI in agreement with
  // whatever is already on screen.
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: Theme, storageKey: string) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // localStorage may be unavailable (private browsing, etc.) — the class
    // still applies for the current session, it just won't persist.
  }
}

/**
 * Dark/light theme state.
 *
 * This hook does NOT own first-paint theme application — that happens in a
 * blocking inline `<script>` in the relevant layout (admin or store) so
 * there's no flash of the wrong theme before hydration. This hook only
 * reads that already-applied state on mount and exposes a way to change it.
 *
 * @param storageKey  localStorage key for persisting the preference.
 *   Defaults to `"admin-theme"` so every existing admin call site is
 *   unaffected. The store passes `"store-theme"` to keep preferences
 *   independent in the same browser.
 *
 * No React Context/Provider: the only consumers today are the toggle
 * buttons in `AdminLayoutClient` and `StoreNavbar`. If a later feature
 * needs the theme value in multiple independent subtrees at once, wrap
 * this in a context then — until that's a real need, every `useTheme()`
 * call independently reads the same source of truth
 * (`document.documentElement.classList`), so multiple instances never
 * disagree.
 */
export function useTheme(storageKey: string = "admin-theme") {
  // Matches on server + first client render (both resolve to "light");
  // reconciled to the real value in the effect below, and `<html>` carries
  // `suppressHydrationWarning` in the layout for this exact gap.
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(getInitialTheme());
  }, []);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next, storageKey);
    setThemeState(next);
  }, [storageKey]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next, storageKey);
      return next;
    });
  }, [storageKey]);

  return { theme, setTheme, toggleTheme };
}
