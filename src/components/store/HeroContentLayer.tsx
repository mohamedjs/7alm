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
 * One featured product's compact info block — bottom-start corner of the
 * Lookbook showcase card (McLaren-headphones reference: a small specs
 * paragraph anchored to the card corner, not a giant centered headline).
 * Name, short description, price, and the commerce CTAs live here;
 * layers stack in the same corner slot and crossfade with scroll.
 *
 * Extracted into its own component so its `useTransform` call is at this
 * component's top level — `LookbookHero` renders one `HeroContentLayer`
 * per section via `.map()`, but each instance is a separate component
 * call, so the hook is still called unconditionally exactly once per
 * render of *this* component (Rules of Hooks).
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
  const isCurrent = i === activeIndex;

  return (
    <motion.div
      style={{ opacity }}
      className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-150 ${
        !isCurrent ? "pointer-events-none" : ""
      }`}
      initial={false}
    >
      <span
        className="mb-3 inline-block w-fit border-b-2 pb-1 text-xs font-semibold tracking-wide"
        style={{ color: section.product.theme_color, borderColor: section.product.theme_color }}
      >
        {t("store.hero.eyebrow")}
      </span>

      <h2 className="mb-2 font-heading text-2xl font-black leading-tight text-text-primary sm:text-3xl">
        {section.product.name}
      </h2>

      <p className="mb-3 max-w-[17rem] text-sm leading-relaxed text-text-muted line-clamp-3">
        {section.product.description || t("store.hero.defaultDescription")}
      </p>

      <div className="mb-4 text-lg font-bold" style={{ color: section.product.theme_color }}>
        {section.product.price.toLocaleString()} {t("store.product.currency")}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAddToCart}
          disabled={!isCurrent}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-dark-950 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: section.product.theme_color }}
        >
          {justAdded && isCurrent ? (
            <>
              <Check className="h-4 w-4" />
              {t("store.hero.ctaAdded")}
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" />
              {t("store.hero.ctaAdd")}
            </>
          )}
        </button>
        <Link
          href={`/product/${section.product.slug}`}
          tabIndex={isCurrent ? 0 : -1}
          className={`text-sm font-medium text-text-muted underline underline-offset-4 transition-colors hover:text-text-primary ${
            !isCurrent ? "pointer-events-none" : ""
          }`}
        >
          {t("store.hero.viewDetails")}
        </Link>
      </div>
    </motion.div>
  );
}
