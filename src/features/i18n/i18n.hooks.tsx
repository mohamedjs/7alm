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

function getInitialLocale(): Locale {
  if (typeof document === "undefined") return "ar";
  // Read whatever the pre-paint inline script (see (admin)/admin/layout.tsx
  // or (store)/layout.tsx) already applied to <html>, rather than
  // re-reading localStorage — this keeps this hook in agreement with
  // whatever is already on screen, mirroring useTheme()'s
  // getInitialTheme().
  return document.documentElement.dir === "ltr" ? "en" : "ar";
}

function applyLocale(locale: Locale, storageKey: string) {
  const root = document.documentElement;
  root.lang = locale;
  root.dir = locale === "ar" ? "rtl" : "ltr";
  try {
    localStorage.setItem(storageKey, locale);
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
 * Wraps a tree (admin or store layout) so every descendant component can
 * call `useLocale()`. Unlike `useTheme()` — which has a single consumer
 * and deliberately skips Context — the locale/`t()` pair is consumed by
 * nearly every component, so a Context is the right tool here.
 *
 * @param storageKey  localStorage key for persisting the preference.
 *   Defaults to `"admin-locale"` so every existing admin call site is
 *   unaffected. The store passes `"store-locale"` to keep preferences
 *   independent in the same browser.
 *
 * This provider does NOT own first-paint locale application — that
 * happens in a blocking inline `<script>` in the relevant layout so
 * there's no flash of the wrong language/direction before hydration.
 * This provider only reads that already-applied state on mount (matching
 * `useTheme`'s `getInitialTheme` pattern) and exposes a way to change it.
 */
export function LocaleProvider({
  children,
  storageKey = "admin-locale",
}: {
  children: React.ReactNode;
  storageKey?: string;
}) {
  // Matches on server + first client render (both resolve to "ar", the
  // default); reconciled to the real value in the effect below. The
  // `<html>` carries `suppressHydrationWarning` for this exact gap (see
  // the theme no-FOUC comment in the layout).
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    setLocaleState(getInitialLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    applyLocale(next, storageKey);
    setLocaleState(next);
  }, [storageKey]);

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

/** Locale/direction state + dictionary lookup. Must be used within `LocaleProvider`. */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale() must be used within a <LocaleProvider>");
  }
  return ctx;
}

