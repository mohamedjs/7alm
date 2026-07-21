"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

/** localStorage key — stable across 004/005/006, do not rename. */
const STORAGE_KEY = "admin-theme";

function getInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  // Read whatever the pre-paint inline script (see (admin)/admin/layout.tsx)
  // already applied to <html>, rather than re-reading localStorage — this
  // keeps the toggle UI in agreement with whatever is already on screen.
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage may be unavailable (private browsing, etc.) — the class
    // still applies for the current session, it just won't persist.
  }
}

/**
 * Admin dark/light theme state.
 *
 * This hook does NOT own first-paint theme application — that happens in a
 * blocking inline `<script>` in `src/app/(admin)/admin/layout.tsx` (T004)
 * so there's no flash of the wrong theme before hydration. This hook only
 * reads that already-applied state on mount and exposes a way to change it.
 *
 * No React Context/Provider: the only consumer today is the toggle button
 * in `AdminLayoutClient`. If a later feature needs the theme value in
 * multiple independent subtrees at once, wrap this in a context then —
 * until that's a real need, every `useTheme()` call independently reads
 * the same source of truth (`document.documentElement.classList`), so
 * multiple instances never disagree.
 */
export function useTheme() {
  // Matches on server + first client render (both resolve to "light");
  // reconciled to the real value in the effect below, and `<html>` carries
  // `suppressHydrationWarning` in the admin layout for this exact gap.
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(getInitialTheme());
  }, []);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}
