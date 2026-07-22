"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/auth.hooks";
import LoginForm from "@/components/admin/auth/LoginForm";
import { useTheme } from "@/features/theme/theme.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { DictKey } from "@/features/i18n/dictionary";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";

/**
 * Admin shell — horizontal top bar (006-admin-i18n-rtl-toggle amendment,
 * superseding 005's vertical sidebar structure while keeping its token/
 * spacing language: rounded cards, `bg-surface`/`border-border`, etc.).
 *
 * Layout (logical properties only, so this mirrors correctly for RTL):
 * - Bar start: app name, then horizontal pill nav tabs.
 * - Bar end: avatar dropdown (email + logout) → theme toggle → language
 *   toggle (outermost at the bar's end).
 * - Below the bar: a single full-width content column (no more sidebar
 *   split).
 * - Mobile: nav tabs collapse into a hamburger dropdown; avatar/theme/
 *   language controls stay visible in the compact header itself.
 *
 * 008-neumorphism: Top bar uses neu-raised, nav pills use neu-pressed
 * active state, buttons use neu-btn, dropdown uses neu-raised card.
 */
export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, user, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();

  // Close the avatar dropdown on outside click — the established pattern
  // for this codebase (no menu/popover library present).
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isUserMenuOpen]);

  // The dedicated /admin/login route renders without the dashboard shell,
  // regardless of any (possibly stale) client-side session.
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (!token) {
    return <LoginForm />;
  }

  const navLinks: { key: DictKey; path: string }[] = [
    { key: "nav.dashboard", path: "/admin" },
    { key: "nav.orders", path: "/admin/orders" },
    { key: "nav.products", path: "/admin/products" },
    { key: "nav.categories", path: "/admin/categories" },
    { key: "nav.testimonials", path: "/admin/testimonials" },
  ];

  const ThemeIcon = theme === "dark" ? SunIcon : MoonIcon;

  return (
    <div className="min-h-screen bg-surface transition-colors">
      {/* Top bar — floating style */}
      <div className="sticky top-0 z-50 p-4 pb-0">
        <header className="rounded-2xl border border-border bg-surface-raised transition-colors neu-raised shadow-sm">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
            {/* Start: brand + horizontal nav pills */}
            <div className="flex min-w-0 items-center gap-6">
              <Link href="/admin" className="shrink-0 text-xl font-black tracking-tight text-brand-600 dark:text-brand-500">
              {t("nav.appName")}
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => {
                const isActive = pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                      isActive
                        ? "neu-pressed bg-surface text-brand-500"
                        : "text-text-muted hover:text-text-primary hover:neu-raised-sm"
                    }`}
                  >
                    {t(link.key)}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* End: avatar dropdown, theme toggle, language toggle, mobile menu button */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen((v) => !v)}
                aria-label={t("action.userMenu")}
                aria-expanded={isUserMenuOpen}
                className="flex items-center gap-1.5 rounded-xl bg-surface-raised border border-border ps-1 pe-2 py-1 text-text-primary transition-all hover:neu-pressed-sm"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 dark:bg-brand-500 text-xs font-bold text-white">
                  {(user?.email ?? "?").charAt(0).toUpperCase()}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-text-muted transition-transform ${
                    isUserMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isUserMenuOpen && (
                <div className="absolute end-0 top-full z-50 mt-2 w-60 rounded-2xl bg-surface p-2 neu-raised">
                  <p className="truncate px-2 py-1.5 text-xs text-text-muted">{user?.email}</p>
                  <div className="my-1 border-t border-border/30" />
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-start text-sm text-text-primary transition-all hover:neu-pressed-sm"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("action.logout")}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t("action.themeToLight") : t("action.themeToDark")}
              title={theme === "dark" ? t("action.themeToLight") : t("action.themeToDark")}
              className="rounded-xl p-2 text-text-muted border border-border bg-surface-raised transition-all hover:neu-pressed-sm hover:text-text-primary"
            >
              <ThemeIcon className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-0.5 rounded-xl p-0.5 bg-surface-raised neu-pressed-sm">
              <button
                type="button"
                onClick={() => setLocale("en")}
                aria-pressed={locale === "en"}
                aria-label="English"
                className={`rounded-lg px-2 py-1 text-xs font-semibold transition-all ${
                  locale === "en"
                    ? "bg-surface neu-raised-sm text-brand-600 dark:text-brand-500"
                    : "text-text-muted hover:text-text-primary hover:neu-raised-sm"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocale("ar")}
                aria-pressed={locale === "ar"}
                aria-label="العربية"
                className={`rounded-lg px-2 py-1 text-xs font-semibold transition-all ${
                  locale === "ar"
                    ? "bg-surface neu-raised-sm text-brand-600 dark:text-brand-500"
                    : "text-text-muted hover:text-text-primary hover:neu-raised-sm"
                }`}
              >
                AR
              </button>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              aria-label={isMobileMenuOpen ? t("action.closeMenu") : t("action.openMenu")}
              className="rounded-xl p-2 text-text-muted border border-border bg-surface-raised transition-all hover:neu-pressed-sm hover:text-text-primary md:hidden"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown — follows theme */}
        {isMobileMenuOpen && (
          <nav className="flex flex-col gap-1 border-t border-border/30 p-3 md:hidden bg-surface-raised rounded-b-2xl">
            {navLinks.map((link) => {
              const isActive = pathname === link.path;
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "neu-pressed bg-surface text-brand-500"
                      : "text-text-muted hover:text-text-primary hover:neu-raised-sm"
                  }`}
                >
                  {t(link.key)}
                </Link>
              );
            })}
          </nav>
        )}
        </header>
      </div>

      {/* Main Content — single full-width column below the bar */}
      <main className="bg-surface p-4 transition-colors md:p-8">{children}</main>
    </div>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5m0 15V21m8.485-8.485H19M5 12H3.515m13.435 6.364-1.06-1.06M6.11 6.11l-1.06-1.06m12.02 0-1.06 1.06M6.11 17.89l-1.06 1.06M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  );
}
