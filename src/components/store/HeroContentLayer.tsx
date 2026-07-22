"use client";

import Link from "next/link";
import { Check, ShoppingBag } from "lucide-react";
import { motion, useTransform, type MotionValue } from "motion/react";
import type { LookbookSection } from "@/features/store/store.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface HeroContentLayerProps {
  section: LookbookSection;
  scrollYProgress: MotionValue<number>;
  prev: number;
  curr: number;
  next: number;
  i: number;
  N: number;
  activeIndex: number;
  prefersReducedMotion: boolean;
  justAdded: boolean;
  onAddToCart: () => void;
}

/**
 * One featured product's headline/eyebrow/description/CTA layer inside
 * the multi-section Lookbook hero (see `LookbookHero.tsx`).
 *
 * Extracted into its own component so its `useTransform` call is at this
 * component's top level — `LookbookHero` renders one `HeroContentLayer`
 * per section via `.map()`, but each instance is a separate component
 * call, so the hook is still called unconditionally exactly once per
 * render of *this* component. Calling `useTransform` directly inside the
 * parent's `.map()` callback (the previous implementation) violated the
 * Rules of Hooks — hooks can't be called inside a loop/callback of a
 * single component's render.
 */
export default function HeroContentLayer({
  section,
  scrollYProgress,
  prev,
  curr,
  next,
  i,
  N,
  activeIndex,
  prefersReducedMotion,
  justAdded,
  onAddToCart,
}: HeroContentLayerProps) {
  const { t } = useLocale();

  const opacityRaw = useTransform(
    scrollYProgress,
    [prev, curr, next],
    [i === 0 ? 1 : 0, 1, i === N - 1 ? 1 : 0]
  );
  const opacity = prefersReducedMotion ? (i === activeIndex ? 1 : 0) : opacityRaw;
  const isActive = prefersReducedMotion ? i === activeIndex : true;
  const isCurrent = i === activeIndex;

  return (
    <motion.div
      style={{ opacity }}
      className={`absolute inset-x-0 flex flex-col justify-center transition-opacity duration-150 ${!isActive && prefersReducedMotion ? "pointer-events-none" : ""}`}
      initial={false}
    >
      <div>
        <span
          className="inline-block text-sm font-semibold tracking-wide mb-4 border-b-2 pb-1"
          style={{ color: section.product.theme_color, borderColor: section.product.theme_color }}
        >
          {t("store.hero.eyebrow")}
        </span>

        <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black text-text-primary leading-[1.05] mb-6">
          {section.product.name}
        </h1>

        <p className="text-lg text-text-muted max-w-md mb-8 leading-relaxed">
          {section.product.description || t("store.hero.defaultDescription")}
        </p>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onAddToCart}
            disabled={!isCurrent}
            className="inline-flex items-center gap-2 rounded-full px-8 py-4 font-bold text-dark-950 transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: section.product.theme_color }}
          >
            {justAdded && isCurrent ? (
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
            href={`/product/${section.product.slug}`}
            className={`text-sm font-medium text-text-muted hover:text-text-primary transition-colors underline underline-offset-4 ${!isCurrent ? "pointer-events-none" : ""}`}
          >
            {t("store.hero.viewDetails")}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
