"use client";

import Link from "next/link";
import { Check, ShoppingBag } from "lucide-react";
import { motion, useTransform, type MotionValue } from "motion/react";
import { useMemo } from "react";
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

/** Tolerance for float drift when testing whether an offset is in [0, 1]. */
const EPS = 1e-6;

/**
 * Fraction of a section-step either side of a section's breakpoint in
 * which its text is visible. Kept strictly below 0.5 so two adjacent
 * sections' windows can NEVER overlap — at any scroll position at most
 * one section's text has non-zero opacity, which is what prevents the
 * "four titles ghosting over each other" artifact (all layers stack in
 * the same corner slot, so unlike the spatially-separated filmstrip
 * images, any simultaneous opacity here reads as a glitch).
 */
const WINDOW = 0.45;

/**
 * Pads a keyframe track so it explicitly covers offsets 0 and 1 by
 * holding the edge values flat. WAAPI (which Motion uses to
 * hardware-accelerate these scroll-linked transforms) inserts IMPLICIT
 * keyframes at 0/1 from the element's underlying style when they're
 * missing — for an opacity track ending at [.., 0.15 → 0] that means
 * opacity silently interpolates back up toward the underlying 1 as
 * scroll approaches the end, resurrecting "hidden" layers as ghosts.
 */
function padTo01(inputs: number[], ...tracks: number[][]) {
  if (inputs.length === 0) return;
  if (inputs[0] > EPS) {
    inputs.unshift(0);
    for (const track of tracks) track.unshift(track[0]);
  }
  if (inputs[inputs.length - 1] < 1 - EPS) {
    inputs.push(1);
    for (const track of tracks) track.push(track[track.length - 1]);
  }
}

/**
 * One featured product's compact info block — bottom-start corner of the
 * Lookbook showcase stage (McLaren-headphones reference: a small specs
 * paragraph anchored to the corner, not a giant centered headline).
 * Name, short description, price, and the commerce CTAs live here;
 * layers stack in the same corner slot, and each one fades + slides
 * through only within its own non-overlapping scroll window (see
 * `WINDOW`).
 *
 * Keyframe hygiene (WAAPI rules, same as `HeroImageLayer`): offsets
 * outside [0, 1] are dropped, the track is padded to explicitly cover
 * 0 and 1 (see `padTo01`), and inputs stay strictly increasing.
 *
 * Extracted into its own component so its `useTransform` calls are at
 * this component's top level (Rules of Hooks — the parent renders one
 * layer per section via `.map()`).
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

  const { inputs, opacityFrames, yFrames } = useMemo(() => {
    // Step to the nearest existing neighbour (edge sections only have
    // one); N===1 never reaches this component, so a 1 fallback is
    // purely defensive.
    const step = Math.max(next - curr, curr - prev) || 1;
    const half = WINDOW * step;

    const inputs: number[] = [];
    const opacityFrames: number[] = [];
    const yFrames: number[] = [];
    const keyframes: Array<[offset: number, opacity: number, y: number]> = [
      [curr - half, 0, 18],
      [curr, 1, 0],
      [curr + half, 0, -18],
    ];
    for (const [offset, opacity, y] of keyframes) {
      if (offset < -EPS || offset > 1 + EPS) continue;
      inputs.push(Math.min(1, Math.max(0, offset)));
      opacityFrames.push(opacity);
      yFrames.push(y);
    }
    padTo01(inputs, opacityFrames, yFrames);
    return { inputs, opacityFrames, yFrames };
  }, [prev, curr, next]);

  const opacityRaw = useTransform(scrollYProgress, inputs, opacityFrames);
  const yRaw = useTransform(scrollYProgress, inputs, yFrames);

  const opacity = prefersReducedMotion ? (i === activeIndex ? 1 : 0) : opacityRaw;
  const y = prefersReducedMotion ? 0 : yRaw;
  const isCurrent = i === activeIndex;

  return (
    <motion.div
      style={{ opacity, y }}
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
