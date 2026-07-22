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
 * Flat, full-width header (McLaren-headphones reference redesign) —
 * flush to the top edge, no detached pill, no rounded corners, no
 * neumorphic relief. It keeps `.store-glass` (theme-reactive
 * translucency + blur, see globals.css) as its background so the nav
 * text stays legible over the light `bg-surface` pages and the hero's
 * color wash alike; scrolling past the top adds only a hairline border
 * and soft shadow, never a shape change.
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
 * - Mobile: center links collapse into a dropdown under the bar,
 *   controls stay visible in the compact header.
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
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ${
          isScrolled
            ? "store-glass border-b border-border/60 shadow-md shadow-black/5"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
          {/* Start: wordmark */}
          <Link href="/" className="flex shrink-0 items-center gap-1.5 font-heading text-lg font-extrabold">
            <span className="text-brand-600 dark:text-brand-400">{t("store.footer.brand")}</span>
            <span className="text-text-primary">7alm</span>
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

        {/* Mobile nav dropdown */}
        {isMobileMenuOpen && (
          <div className="border-t border-border/60 px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`py-2 transition-colors ${navLabelClass} ${
                      isActive
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-2 flex w-fit items-center sm:hidden">
              {localeButton("en", "EN", "English")}
              <span aria-hidden="true" className="text-xs text-text-muted/50">
                /
              </span>
              {localeButton("ar", "AR", "العربية")}
            </div>
          </div>
        )}
      </header>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
