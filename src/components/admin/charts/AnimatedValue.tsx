"use client";

import { useEffect, useRef } from "react";
import { useSpring, useTransform, motion, useReducedMotion } from "motion/react";

interface AnimatedValueProps {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}

/** Spring-animated counter (e.g. a StatTile's headline number) that counts up/down to `value`. */
export function AnimatedValue({ value, format, className = "" }: AnimatedValueProps) {
  const prefersReducedMotion = useReducedMotion();
  const spring = useSpring(0, { stiffness: 50, damping: 20 });
  const display = useTransform(spring, (v) => format(Math.round(v)));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (prefersReducedMotion) {
      spring.jump(value);
    } else {
      spring.set(value);
    }
  }, [value, spring, prefersReducedMotion]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsubscribe;
  }, [display]);

  return (
    <motion.span ref={ref} className={`tabular-nums ${className}`}>
      {format(prefersReducedMotion ? value : 0)}
    </motion.span>
  );
}

export default AnimatedValue;
