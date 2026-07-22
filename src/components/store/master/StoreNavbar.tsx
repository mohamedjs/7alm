"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, ShoppingBag, Sun, X } from "lucide-react";
import type { Category } from "@/features/shared/types";
import { useHeroNavVisible } from "@/features/store/store.hooks";
import { useCart } from "@/features/cart/cart.hooks";
import { useTheme } from "@/features/theme/theme.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";
import CartDrawer from "../cart/CartDrawer";
import BrandLogo from "./BrandLogo";

interface StoreNavbarProps {
  categories: Category[];
}

/**
 * Flat, transparent header floating over the top of the full-bleed
 * Lookbook hero. It is technically `fixed` but behaves like part of the
 * hero, not a sticky viewport bar: `useHeroNavVisible` keeps it on
 * screen for the whole pinned filmstrip scroll sequence (the hero holds
 * the viewport for N×100vh — an `absolute` bar would scroll away on the
 * first wheel tick while the slider is still playing), then slides it
 * up and away once the hero un-pins; on hero-less pages it leaves as
 * soon as the visitor scrolls. Text stays legible because every color
 * is a theme token over the token-driven `bg-surface` stage. While the
 * mobile menu is open the bar becomes a glass sheet (`.store-glass`,
 * rounded bottom) so the bento panel never hangs on a transparent
 * strip.
 *
 * Layout (logical properties only — mirrors correctly under RTL):
 * - Start: wordmark.
 * - Center (desktop only): Home / All products / up to 3 categories as
 *   flat micro-labels — uppercase + wide tracking in English; plain
 *   compact labels in Arabic, since letter-spacing visually breaks
 *   connected Arabic glyphs. The active link carries a small accent
 *   underline instead of a pill background.
 * - End: flat icon buttons (theme toggle, cart with live count badge)
 *   and a minimal EN/AR text pair.
 * - Mobile: the burger opens a detached bento-grid panel of chunky
 *   neumorphic link tiles (`neu-raised-sm` / active `neu-pressed-sm`,
 *   the admin design language) instead of a flat link list.
 */
export default function StoreNavbar({ categories }: StoreNavbarProps) {
  const isNavVisible = useHeroNavVisible();
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

  // Micro-label typography: uppercase + wide tracking is Latin-only —
  // letter-spacing breaks connected Arabic glyphs, so Arabic (the
  // default locale) gets plain compact labels at the same weight.
  const navLabelClass =
    locale === "en" ? "text-[11px] font-semibold uppercase tracking-[0.18em]" : "text-sm font-semibold";

  const localeButton = (target: "en" | "ar", label: string, ariaLabel: string) => (
    <button
      type="button"
      onClick={() => setLocale(target)}
      aria-pressed={locale === target}
      aria-label={ariaLabel}
      className={`px-1 text-[11px] font-bold tracking-widest transition-colors ${
        locale === target
          ? "text-brand-600 dark:text-brand-400"
          : "text-text-muted hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          isNavVisible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"
        } ${
          isMobileMenuOpen
            ? "store-glass rounded-b-3xl border-b border-border/60 shadow-lg shadow-black/10"
            : "bg-transparent"
        }`}
      >
        <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-5 sm:px-10">
          {/* Start: wordmark */}
          <Link href="/" className="flex shrink-0 items-center">
            <BrandLogo className="h-8 w-auto text-text-primary" />
          </Link>

          {/* Center: flat micro-label nav (desktop) */}
          <div className="hidden flex-1 items-center justify-center gap-7 md:flex lg:gap-9">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative py-1 transition-colors ${navLabelClass} ${
                    isActive ? "text-text-primary" : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-0.5 start-0 h-0.5 w-4 rounded-full bg-brand-600 dark:bg-brand-400"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* End: flat controls */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t("action.themeToLight") : t("action.themeToDark")}
              title={theme === "dark" ? t("action.themeToLight") : t("action.themeToDark")}
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface/70 hover:text-text-primary"
            >
              <ThemeIcon className="h-4 w-4" />
            </button>

            <div className="hidden items-center sm:flex">
              {localeButton("en", "EN", "English")}
              <span aria-hidden="true" className="text-xs text-text-muted/50">
                /
              </span>
              {localeButton("ar", "AR", "العربية")}
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label={t("store.nav.cartLabel")}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface/70 hover:text-text-primary"
            >
              <ShoppingBag className="h-4 w-4" />
              {itemCount > 0 && (
                <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              aria-label={isMobileMenuOpen ? t("action.closeMenu") : t("action.openMenu")}
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface/70 hover:text-text-primary md:hidden"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </nav>

        {/* Mobile nav — bento-grid panel in the admin's neumorphic
            design language: a 2-column grid of chunky link tiles
            (`neu-raised-sm`; the active route pressed-in with
            `neu-pressed-sm` + brand tint); the last odd tile spans both
            columns so the grid always closes cleanly. The language
            switch sits in a full-width pressed tray below. While open,
            the whole bar becomes a rounded glass card (see header
            class) so the grid never hangs on a transparent strip. */}
        {isMobileMenuOpen && (
          <div className="px-3 pb-3 md:hidden">
            <nav className="grid grid-cols-2 gap-2">
              {navLinks.map((link, index) => {
                const isActive = pathname === link.href;
                const spansBoth = index === navLinks.length - 1 && navLinks.length % 2 === 1;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex min-h-16 items-center justify-center rounded-2xl bg-surface px-4 py-3 text-center transition-all ${navLabelClass} ${
                      spansBoth ? "col-span-2" : ""
                    } ${
                      isActive
                        ? "neu-pressed-sm text-brand-600 dark:text-brand-400"
                        : "neu-raised-sm text-text-primary/80 hover:text-text-primary"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-2 flex items-center justify-between rounded-2xl bg-surface/70 px-4 py-2.5 neu-pressed-sm">
              <span className="text-xs font-semibold text-text-muted">{t("action.language")}</span>
              <div className="flex items-center gap-0.5 rounded-xl bg-surface p-0.5 neu-raised-sm">
                <button
                  type="button"
                  onClick={() => setLocale("en")}
                  aria-pressed={locale === "en"}
                  aria-label="English"
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    locale === "en"
                      ? "neu-pressed-sm text-brand-600 dark:text-brand-400"
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
                      ? "neu-pressed-sm text-brand-600 dark:text-brand-400"
                      : "text-text-muted"
                  }`}
                >
                  AR
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
