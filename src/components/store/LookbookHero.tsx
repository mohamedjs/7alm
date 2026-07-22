"use client";

import Image from "next/image";
import Link from "next/link";
import { AtSign, Check, MessageCircle, Send, ShoppingBag } from "lucide-react";
import { useState, useRef, type CSSProperties } from "react";
import { useScroll, useTransform, useReducedMotion, motion, useMotionValueEvent } from "motion/react";
import type { Product } from "@/features/shared/types";
import { useLookbookSections } from "@/features/store/store.hooks";
import LookbookGlow from "./LookbookGlow";
import ProductThumbRow from "./ProductThumbRow";
import HeroContentLayer from "./HeroContentLayer";
import HeroImageLayer from "./HeroImageLayer";
import { useCart } from "@/features/cart/cart.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface LookbookHeroProps {
  featuredProducts: Product[];
}

const FALLBACK_ACCENT = "#06b6d4";

/**
 * Faint halftone dot texture (009 visual redo, "Image 1" reference) — a
 * plain repeating radial-gradient, not an image asset, kept as a `style`
 * object rather than an Tailwind arbitrary-value class because escaping a
 * multi-argument `radial-gradient(...)` inside a class string is more
 * fragile than a plain object here. Purely decorative (`aria-hidden`).
 *
 * The dot color itself is `var(--hero-halftone-dot)` (defined in
 * globals.css on `.store-tokens`/`.dark.store-tokens`) rather than a
 * hardcoded white — dark dots on the light default stage, light dots
 * once the visitor toggles dark, so this texture stays legible in both
 * themes without any JS theme branching here.
 */
const halftoneStyle: CSSProperties = {
  backgroundImage: "radial-gradient(circle, var(--hero-halftone-dot) 1px, transparent 1.6px)",
  backgroundSize: "15px 15px",
};

/**
 * The Lookbook hero stage is theme-reactive and light by default (spec
 * 009 FR-009, reversed 2026-07-22 — see spec.md's updated FR-009 and
 * Open Question #1). It uses the same store surface tokens as every
 * other store surface (`bg-surface`, `text-text-primary`, `text-text-muted`)
 * so light mode renders a soft lavender-grey stage instead of a hardcoded
 * near-black block; dark mode still exists via the theme toggle. The
 * per-product `theme_color` glow/wash crossfade — the feature's actual
 * scroll-driven payoff — is unaffected by this and stays in perfect sync
 * with scroll either way.
 */
export default function LookbookHero({ featuredProducts }: LookbookHeroProps) {
  const sections = useLookbookSections(featuredProducts);
  const N = sections.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { addItem } = useCart();
  const { t } = useLocale();
  const [justAdded, setJustAdded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // N breakpoints -> N-1 crossfade zones, e.g. N=4 => [0, 0.33, 0.67, 1]
  const breakpoints = N > 1 ? sections.map((_, i) => i / Math.max(N - 1, 1)) : [0];
  const glowColorRaw = useTransform(
    scrollYProgress,
    breakpoints,
    sections.length > 0 ? sections.map((s) => s.product.theme_color) : [FALLBACK_ACCENT]
  );

  // Update activeIndex based on scroll — skipped entirely when reduced
  // motion is preferred (see US3): with the container height also capped
  // to one screen in that case (below), activeIndex becomes purely
  // click-driven via ProductThumbRow/the dot-nav, so a reduced-motion
  // visitor is never forced through N×100vh of scroll just to reach the
  // rest of the page.
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (N < 2 || prefersReducedMotion) return;
    const index = Math.round(latest * (N - 1));
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  });

  const activeItem = sections[activeIndex]?.product ?? null;
  const accent = activeItem?.theme_color || FALLBACK_ACCENT;

  const handleAddToCart = () => {
    if (!activeItem) return;
    addItem(
      {
        product_id: activeItem.id,
        name: activeItem.name,
        slug: activeItem.slug,
        main_image: activeItem.main_image,
        price: activeItem.price,
        theme_color: activeItem.theme_color,
      },
      1
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleSelectSection = (index: number) => {
    if (prefersReducedMotion) {
      setActiveIndex(index);
    } else if (containerRef.current) {
      const containerTop = containerRef.current.offsetTop;
      const containerHeight = containerRef.current.offsetHeight - window.innerHeight;
      const targetScroll = containerTop + (index / Math.max(N - 1, 1)) * containerHeight;
      window.scrollTo({ top: targetScroll, behavior: "smooth" });
    }
  };

  // Purely decorative brand-presence glyphs (Image 1 reference: "small
  // social icons bottom-start"). No real social URLs exist yet, so these
  // are visual-only — aria-hidden, not focusable, not a navigation claim.
  const socialGlyphs = (
    <div aria-hidden="true" className="pointer-events-none absolute bottom-6 start-6 z-20 flex items-center gap-3 text-text-muted">
      <AtSign className="h-4 w-4" />
      <Send className="h-4 w-4" />
      <MessageCircle className="h-4 w-4" />
    </div>
  );

  if (N < 2) {
    return (
      <section className="relative w-full overflow-hidden rounded-b-[2.5rem] bg-surface pb-20 pt-32 sm:rounded-b-[3.5rem] lg:pb-28 lg:pt-44">
        <div aria-hidden="true" className="pointer-events-none absolute -top-8 end-6 h-56 w-56 opacity-[0.07] sm:h-72 sm:w-72" style={halftoneStyle} />
        <div className="container relative z-10 mx-auto px-6">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="relative z-10 text-start">
              <span
                className="inline-block text-sm font-semibold tracking-wide mb-4 border-b-2 pb-1"
                style={{ color: accent, borderColor: accent }}
              >
                {t("store.hero.eyebrow")}
              </span>

              <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black text-text-primary leading-[1.05] mb-6">
                {activeItem ? activeItem.name : t("store.hero.defaultHeadline")}
              </h1>

              <p className="text-lg text-text-muted max-w-md mb-8 leading-relaxed">
                {activeItem?.description || t("store.hero.defaultDescription")}
              </p>

              {activeItem && (
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="inline-flex items-center gap-2 rounded-full px-8 py-4 font-bold text-dark-950 transition-transform hover:scale-105"
                    style={{ backgroundColor: accent }}
                  >
                    {justAdded ? (
                      <>
                        <Check className="w-5 h-5" />
                        {t("store.hero.ctaAdded")}
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-5 h-5" />
                        {t("store.hero.ctaAdd")}
                      </>
                    )}
                  </button>
                  <Link
                    href={`/product/${activeItem.slug}`}
                    className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors underline underline-offset-4"
                  >
                    {t("store.hero.viewDetails")}
                  </Link>
                </div>
              )}
            </div>

            <div className="relative flex items-center justify-center min-h-[320px] lg:min-h-[480px]">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex select-none items-center justify-center font-heading text-[10rem] font-black leading-none text-text-primary/[0.06] sm:text-[15rem]"
              >
                01
              </span>
              <LookbookGlow color={accent} />
              {activeItem?.main_image && (
                <motion.div
                  key={activeItem.id}
                  className="relative z-10"
                  initial={prefersReducedMotion ? false : { y: -260, opacity: 0 }}
                  animate={prefersReducedMotion ? undefined : { y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Image
                    src={activeItem.main_image}
                    alt={activeItem.name}
                    width={420}
                    height={420}
                    priority
                    className="w-full max-w-[320px] lg:max-w-[420px] h-auto object-contain drop-shadow-2xl"
                  />
                </motion.div>
              )}
            </div>
          </div>
        </div>
        {socialGlyphs}
      </section>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height: prefersReducedMotion ? "100vh" : `${N * 100}vh` }}
      className="relative w-full"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden rounded-b-[2.5rem] bg-surface sm:rounded-b-[3.5rem]">
        {/* Full-bleed color wash — the "smooth per-section color gradient"
            (Image 1 reference), reusing the same glowColorRaw MotionValue
            that drives the radial glow so both stay in perfect sync. Its
            opacity comes from `--hero-wash-opacity` (globals.css,
            theme-tuned — a soft tint on the light default, unchanged
            strength on dark) rather than a single hardcoded value. */}
        <motion.div
          aria-hidden="true"
          className="lookbook-wash pointer-events-none absolute inset-0"
          style={{
            backgroundColor: prefersReducedMotion ? accent : glowColorRaw,
          }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute -top-10 end-10 h-64 w-64 opacity-[0.06] sm:h-80 sm:w-80" style={halftoneStyle} />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 start-0 h-48 w-48 opacity-[0.05] sm:h-64 sm:w-64" style={halftoneStyle} />

        <div className="relative z-10 flex h-full items-center">
          <div className="container mx-auto w-full px-6">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="relative z-10 text-start h-[500px] flex flex-col justify-center">
                {sections.map((section, i) => {
                  const prev = breakpoints[i - 1] ?? breakpoints[i];
                  const curr = breakpoints[i];
                  const next = breakpoints[i + 1] ?? breakpoints[i];

                  return (
                    <HeroContentLayer
                      key={section.product.id}
                      section={section}
                      scrollYProgress={scrollYProgress}
                      prev={prev}
                      curr={curr}
                      next={next}
                      i={i}
                      N={N}
                      activeIndex={activeIndex}
                      prefersReducedMotion={!!prefersReducedMotion}
                      justAdded={justAdded}
                      onAddToCart={handleAddToCart}
                    />
                  );
                })}

                <div className="absolute -bottom-16 inset-x-0 z-20">
                  <ProductThumbRow products={featuredProducts} activeIndex={activeIndex} onSelect={handleSelectSection} />
                </div>
              </div>

              <div className="relative flex items-center justify-center min-h-[320px] lg:min-h-[480px]">
                <LookbookGlow color={prefersReducedMotion ? accent : glowColorRaw} />

                {sections.map((section, i) => {
                  const prev = breakpoints[i - 1] ?? breakpoints[i];
                  const curr = breakpoints[i];
                  const next = breakpoints[i + 1] ?? breakpoints[i];

                  return (
                    <HeroImageLayer
                      key={section.product.id}
                      section={section}
                      scrollYProgress={scrollYProgress}
                      prev={prev}
                      curr={curr}
                      next={next}
                      i={i}
                      N={N}
                      activeIndex={activeIndex}
                      prefersReducedMotion={!!prefersReducedMotion}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {socialGlyphs}

        {/* Section dot-indicators, bottom-end (Image 1 reference) — a
            compact scroll-position readout that doubles as a second,
            minimal way to jump sections alongside `ProductThumbRow`'s
            larger thumbnail row (FR-005 retains that as the primary
            control; this is additive, not a replacement). The active dot
            is tinted with that section's own `theme_color` (the per-product
            accent), inactive dots use the theme-reactive muted-ink tokens. */}
        <div className="absolute bottom-6 end-6 z-20 flex items-center gap-2">
          {sections.map((section, i) => (
            <button
              key={section.product.id}
              type="button"
              onClick={() => handleSelectSection(i)}
              aria-label={`${t("store.hero.viewDetails")} ${i + 1}`}
              aria-current={i === activeIndex}
              style={i === activeIndex ? { backgroundColor: section.product.theme_color } : undefined}
              className={`h-2 rounded-full transition-all ${
                i === activeIndex ? "w-6" : "w-2 bg-text-primary/20 hover:bg-text-primary/35"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
