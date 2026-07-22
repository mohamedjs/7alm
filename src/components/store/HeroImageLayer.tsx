"use client";

import Image from "next/image";
import { motion, useTransform, type MotionValue } from "motion/react";
import type { LookbookSection } from "@/features/store/store.hooks";

interface HeroImageLayerProps {
  section: LookbookSection;
  scrollYProgress: MotionValue<number>;
  prev: number;
  curr: number;
  next: number;
  i: number;
  N: number;
  activeIndex: number;
  prefersReducedMotion: boolean;
}

/**
 * One featured product's showcase image + watermark-number layer inside
 * the multi-section Lookbook hero (see `LookbookHero.tsx`).
 *
 * Same extraction rationale as `HeroContentLayer`: this component owns
 * its own `useTransform` calls at its top level so `LookbookHero` never
 * calls a hook inside a `.map()` callback.
 */
export default function HeroImageLayer({
  section,
  scrollYProgress,
  prev,
  curr,
  next,
  i,
  N,
  activeIndex,
  prefersReducedMotion,
}: HeroImageLayerProps) {
  const opacityRaw = useTransform(
    scrollYProgress,
    [prev, curr, next],
    [i === 0 ? 1 : 0, 1, i === N - 1 ? 1 : 0]
  );
  // "Reel dropping from the top" — the incoming image descends from well
  // above the stage (behind the fixed navbar, z-50 vs. this layer's z-10)
  // down to rest, then keeps falling further down/out as the *next*
  // section's image drops in from the top over it. Edge sections collapse
  // their outward end to 0 (no previous/next image to hand off to): i===0's
  // "enter" side is pinned at rest (its own top-of-page drop plays once via
  // the `initial`/`animate` mount entrance below, not this scroll transform,
  // so the two never double-apply), and the last section's "exit" side
  // stays at rest since there's nothing further to fall into.
  const yRaw = useTransform(
    scrollYProgress,
    [prev, curr, next],
    [i === 0 ? 0 : -260, 0, i === N - 1 ? 0 : 260]
  );

  const opacity = prefersReducedMotion ? (i === activeIndex ? 1 : 0) : opacityRaw;
  const y = prefersReducedMotion ? 0 : yRaw;
  const isActive = prefersReducedMotion ? i === activeIndex : true;

  return (
    <motion.div
      style={{ opacity }}
      className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${!isActive && prefersReducedMotion ? "pointer-events-none" : ""}`}
      initial={false}
    >
      {/* Giant low-opacity watermark number (Image 1 reference) — sits
          behind the product image, crossfades with it. Theme-aware faint
          tint (light default: a hint of ink on the lavender surface;
          dark: a hint of the light text color) rather than a hardcoded
          white tint. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute select-none font-heading text-[10rem] font-black leading-none text-text-primary/[0.06] sm:text-[15rem]"
      >
        {String(i + 1).padStart(2, "0")}
      </span>
      {section.product.main_image && (
        <motion.div style={{ y }} className="relative z-10">
          {/* First-load-only "drop from behind the navbar" entrance for the
              initial/active product — plays once on mount, independent of
              the scroll-linked `y` above (that MotionValue is pinned at 0
              for i===0 until scroll begins, see the comment on `yRaw`), so
              the two transforms never stack. Skipped under reduced motion. */}
          {i === 0 && !prefersReducedMotion ? (
            <motion.div
              initial={{ y: -260, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <Image
                src={section.product.main_image}
                alt={section.product.name}
                width={420}
                height={420}
                priority
                className="w-full max-w-[320px] lg:max-w-[420px] h-auto object-contain drop-shadow-2xl"
              />
            </motion.div>
          ) : (
            <Image
              src={section.product.main_image}
              alt={section.product.name}
              width={420}
              height={420}
              priority={i === 0}
              className="w-full max-w-[320px] lg:max-w-[420px] h-auto object-contain drop-shadow-2xl"
            />
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
