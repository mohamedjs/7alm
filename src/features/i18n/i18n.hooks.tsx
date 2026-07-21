"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { dictionaries, type DictKey, type Locale } from "./dictionary";

export type { Locale, DictKey };

/** localStorage key — stable for this feature, do not rename. */
const STORAGE_KEY = "admin-locale";

function getInitialLocale(): Locale {
  if (typeof document === "undefined") return "ar";
  // Read whatever the pre-paint inline script (see (admin)/admin/layout.tsx)
  // already applied to <html>, rather than re-reading localStorage — this
  // keeps this hook in agreement with whatever is already on screen,
  // mirroring useTheme()'s getInitialTheme().
  return document.documentElement.dir === "ltr" ? "en" : "ar";
}

function applyLocale(locale: Locale) {
  const root = document.documentElement;
  root.lang = locale;
  root.dir = locale === "ar" ? "rtl" : "ltr";
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // localStorage may be unavailable (private browsing, etc.) — the
    // attribute change still applies for the current session, it just
    // won't persist.
  }
}

interface LocaleContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (next: Locale) => void;
  /** Dictionary lookup — `key` is a `DictKey`, so a typo is a compile error. */
  t: (key: DictKey) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Wraps the admin tree (see `(admin)/admin/layout.tsx`) so every
 * descendant component can call `useLocale()`. Unlike `useTheme()` — which
 * has a single consumer and deliberately skips Context — the locale/`t()`
 * pair is consumed by nearly every admin component, so a Context is the
 * right tool here.
 *
 * This provider does NOT own first-paint locale application — that
 * happens in a blocking inline `<script>` in `(admin)/admin/layout.tsx`
 * so there's no flash of the wrong language/direction before hydration.
 * This provider only reads that already-applied state on mount (matching
 * `useTheme`'s `getInitialTheme` pattern) and exposes a way to change it.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Matches on server + first client render (both resolve to "ar", the
  // default); reconciled to the real value in the effect below. The admin
  // `<html>` carries `suppressHydrationWarning` for this exact gap (see
  // the theme no-FOUC comment in (admin)/admin/layout.tsx).
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    setLocaleState(getInitialLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    applyLocale(next);
    setLocaleState(next);
  }, []);

  const t = useCallback((key: DictKey) => dictionaries[locale][key], [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Admin locale/direction state + dictionary lookup. Must be used within `LocaleProvider`. */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale() must be used within a <LocaleProvider>");
  }
  return ctx;
}
