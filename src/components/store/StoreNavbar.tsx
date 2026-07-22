"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, ShoppingBag, Sun, X } from "lucide-react";
import type { Category } from "@/features/shared/types";
import { useScrollGlass } from "@/features/store/store.hooks";
import { useCart } from "@/features/cart/cart.hooks";
import { useTheme } from "@/features/theme/theme.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";
import CartDrawer from "./CartDrawer";

interface StoreNavbarProps {
  categories: Category[];
}

/**
 * Detached, floating, rounded header — the storefront's version of the
 * admin's `AdminLayoutClient` top bar (refinement A, 008 redo). A margin
 * wrapper keeps it off the viewport edges on every breakpoint; the bar
 * itself uses `.store-glass` (theme-reactive translucency + blur, see
 * globals.css) so it reads well both floating over the always-dark
 * Lookbook hero stage and over the token-driven `bg-surface` on every
 * other store page, plus a soft `neu-raised-sm` shadow and hairline
 * border so it never looks like a harsh flat bar in either theme.
 *
 * Layout (logical properties only — mirrors correctly under RTL):
 * - Start: wordmark.
 * - Center (desktop only): Home / All products / up to 3 categories.
 * - End: theme toggle, EN/AR segmented pill (admin's exact toggle
 *   pattern), cart button with a live red-pill count badge.
 * - Mobile: center links collapse into a dropdown under the bar,
 *   controls stay visible in the compact header (mirrors AdminLayoutClient).
 */
export default function StoreNavbar({ categories }: StoreNavbarProps) {
  const isScrolled = useScrollGlass();
  const { itemCount } = useCart();
  const pathname = usePathname();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme("store-theme");
  const { locale, setLocale, t } = useLocale();

  const topLevelCategories = categories.filter((c) => !c.parent_id).slice(0, 3);
  const categoryLabel = (category: Category) =>
    locale === "en" && category.name_en ? category.name_en : category.name_ar;

  const navLinks = [
    { href: "/", label: t("store.nav.home") },
    { href: "/products", label: t("store.nav.allProducts") },
    ...topLevelCategories.map((c) => ({ href: `/category/${c.slug}`, label: categoryLabel(c) })),
  ];

  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
        <header
          className={`mx-auto max-w-5xl rounded-2xl store-glass border border-border/60 transition-shadow duration-300 neu-raised-sm ${
            isScrolled ? "shadow-lg shadow-black/10" : ""
          }`}
        >
          <nav className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
            {/* Start: wordmark */}
            <Link href="/" className="flex shrink-0 items-center gap-1.5 font-heading text-xl font-extrabold">
              <span className="text-brand-600 dark:text-brand-400">{t("store.footer.brand")}</span>
              <span className="text-text-primary">7alm</span>
            </Link>

            {/* Center: primary nav (desktop) */}
            <div className="hidden flex-1 items-center justify-center gap-1 md:flex">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-surface text-brand-600 dark:text-brand-400 neu-pressed-sm"
                        : "text-text-muted hover:text-text-primary hover:bg-surface/60"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* End: theme + locale + cart */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? t("action.themeToLight") : t("action.themeToDark")}
                title={theme === "dark" ? t("action.themeToLight") : t("action.themeToDark")}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/60 bg-surface/70 text-text-muted transition-all hover:text-text-primary hover:neu-pressed-sm"
              >
                <ThemeIcon className="h-4 w-4" />
              </button>

              <div className="hidden items-center gap-0.5 rounded-xl bg-surface/70 p-0.5 neu-pressed-sm sm:flex">
                <button
                  type="button"
                  onClick={() => setLocale("en")}
                  aria-pressed={locale === "en"}
                  aria-label="English"
                  className={`rounded-lg px-2 py-1 text-xs font-bold transition-all ${
                    locale === "en"
                      ? "bg-surface neu-raised-sm text-brand-600 dark:text-brand-400"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLocale("ar")}
                  aria-pressed={locale === "ar"}
                  aria-label="العربية"
                  className={`rounded-lg px-2 py-1 text-xs font-bold transition-all ${
                    locale === "ar"
                      ? "bg-surface neu-raised-sm text-brand-600 dark:text-brand-400"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  AR
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                aria-label={t("store.nav.cartLabel")}
                className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-border/60 bg-surface/70 text-text-muted transition-all hover:text-text-primary hover:neu-pressed-sm"
              >
                <ShoppingBag className="h-4 w-4" />
                {itemCount > 0 && (
                  <span className="absolute -end-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                aria-label={isMobileMenuOpen ? t("action.closeMenu") : t("action.openMenu")}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/60 bg-surface/70 text-text-muted transition-all hover:text-text-primary hover:neu-pressed-sm md:hidden"
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </nav>

          {/* Mobile nav dropdown */}
          {isMobileMenuOpen && (
            <div className="border-t border-border/60 p-2 md:hidden">
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                        isActive
                          ? "bg-surface text-brand-600 dark:text-brand-400 neu-pressed-sm"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-2 flex w-fit items-center gap-0.5 rounded-xl bg-surface/70 p-0.5 neu-pressed-sm sm:hidden">
                <button
                  type="button"
                  onClick={() => setLocale("en")}
                  aria-pressed={locale === "en"}
                  aria-label="English"
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    locale === "en"
                      ? "bg-surface neu-raised-sm text-brand-600 dark:text-brand-400"
                      : "text-text-muted"
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLocale("ar")}
                  aria-pressed={locale === "ar"}
                  aria-label="العربية"
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    locale === "ar"
                      ? "bg-surface neu-raised-sm text-brand-600 dark:text-brand-400"
                      : "text-text-muted"
                  }`}
                >
                  AR
                </button>
              </div>
            </div>
          )}
        </header>
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
