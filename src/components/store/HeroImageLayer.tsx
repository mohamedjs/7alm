"use client";

import Image from "next/image";
import { motion, useTransform, type MotionValue } from "motion/react";
import { useMemo } from "react";
import type { LookbookSection } from "@/features/store/store.hooks";

interface HeroImageLayerProps {
  section: LookbookSection;
  scrollYProgress: MotionValue<number>;
  /** Breakpoint spacing between adjacent sections: 1 / (N - 1). */
  step: number;
  /** This section's own scroll breakpoint. */
  curr: number;
  i: number;
  activeIndex: number;
  prefersReducedMotion: boolean;
  /** Document direction — flips the filmstrip travel axis under RTL. */
  dir: "ltr" | "rtl";
}

/** Tolerance for float drift when testing whether an offset is in [0, 1]. */
const EPS = 1e-6;

/**
 * Pads keyframe tracks so they explicitly cover offsets 0 and 1 by
 * holding the edge values flat. WAAPI (which Motion uses to
 * hardware-accelerate these scroll-linked transforms) inserts IMPLICIT
 * keyframes at 0/1 from the element's underlying style when they're
 * missing — an opacity track ending mid-range at 0 would otherwise
 * interpolate back up toward the underlying 1 as scroll approaches the
 * end, resurrecting hidden layers as ghosts (and likewise snapping
 * x/scale back toward rest).
 */
function padTo01(inputs: number[], ...tracks: (string | number)[][]) {
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
 * One featured product's showcase image inside the multi-section Lookbook
 * hero (see `LookbookHero.tsx`), redesigned as a horizontal filmstrip
 * (McLaren-headphones reference): the active product sits large in the
 * center of the stage while its neighbours wait at the start/end edges —
 * smaller, dimmed, partially visible — and everything travels sideways
 * continuously with scroll (no mid-scroll pops: position, scale and
 * opacity all derive from the same `scrollYProgress`).
 *
 * The keyframes span up to two steps either side of this section's own
 * breakpoint so a section two-or-more steps away is fully transparent —
 * only the active product and its immediate neighbours are ever visible.
 * Keyframe hygiene (WAAPI rules): offsets outside [0, 1] are dropped
 * (not clamped or extrapolated — `Element.animate` throws on offsets
 * outside [0, 1] or out of order), and the track is then padded to
 * explicitly cover 0 and 1 (see `padTo01`).
 *
 * Extracted component (not inlined in the parent's `.map()`) so the
 * `useTransform` hooks stay at a component's top level — Rules of Hooks.
 */
export default function HeroImageLayer({
  section,
  scrollYProgress,
  step,
  curr,
  i,
  activeIndex,
  prefersReducedMotion,
  dir,
}: HeroImageLayerProps) {
  // Under RTL the "next" section slides in from the start (visual left
  // becomes the outgoing side), so the travel axis flips sign.
  const sign = dir === "rtl" ? -1 : 1;

  const { inputs, xFrames, scaleFrames, opacityFrames } = useMemo(() => {
    const inputs: number[] = [];
    const xFrames: string[] = [];
    const scaleFrames: number[] = [];
    const opacityFrames: number[] = [];
    // k = how many steps of scroll this keyframe sits *before* (negative)
    // or *after* (positive) this section's own breakpoint.
    const keyframes: Array<[k: number, x: number, scale: number, opacity: number]> = [
      [-2, sign * 84, 0.4, 0],
      [-1, sign * 42, 0.5, 0.35],
      [0, 0, 1, 1],
      [1, sign * -42, 0.5, 0.35],
      [2, sign * -84, 0.4, 0],
    ];
    for (const [k, x, scale, opacity] of keyframes) {
      const offset = curr + k * step;
      if (offset < -EPS || offset > 1 + EPS) continue;
      inputs.push(Math.min(1, Math.max(0, offset)));
      xFrames.push(`${x}vw`);
      scaleFrames.push(scale);
      opacityFrames.push(opacity);
    }
    padTo01(inputs, xFrames, scaleFrames, opacityFrames);
    return { inputs, xFrames, scaleFrames, opacityFrames };
  }, [curr, step, sign]);

  const xRaw = useTransform(scrollYProgress, inputs, xFrames);
  const scaleRaw = useTransform(scrollYProgress, inputs, scaleFrames);
  const opacityRaw = useTransform(scrollYProgress, inputs, opacityFrames);

  const opacity = prefersReducedMotion ? (i === activeIndex ? 1 : 0) : opacityRaw;
  const x = prefersReducedMotion ? 0 : xRaw;
  const scale = prefersReducedMotion ? 1 : scaleRaw;

  if (!section.product.main_image) return null;

  return (
    <motion.div
      style={{ opacity, x, scale }}
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-150"
      initial={false}
    >
      {/* First-load entrance for the initial product — a soft rise+fade
          played once on mount, independent of the scroll-linked transforms
          above (all pinned at rest for i===0 until scroll begins), so the
          two never stack. Skipped under reduced motion. */}
      {i === 0 && !prefersReducedMotion ? (
        <motion.div
          initial={{ y: 48, opacity: 0, scale: 0.94 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image
            src={section.product.main_image}
            alt={section.product.name}
            width={460}
            height={460}
            priority
            className="h-auto w-full max-w-[300px] object-contain drop-shadow-2xl sm:max-w-[380px] lg:max-w-[460px]"
          />
        </motion.div>
      ) : (
        <Image
          src={section.product.main_image}
          alt={section.product.name}
          width={460}
          height={460}
          priority={i === 0}
          className="h-auto w-full max-w-[300px] object-contain drop-shadow-2xl sm:max-w-[380px] lg:max-w-[460px]"
        />
      )}
    </motion.div>
  );
}
