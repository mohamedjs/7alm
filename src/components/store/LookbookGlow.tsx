import { motion, type MotionValue } from "motion/react";

interface LookbookGlowProps {
  color: string | MotionValue<string>;
  className?: string;
}

/**
 * Radial blurred glow behind the Lookbook hero's product image.
 * Purely presentational — shape/blur/position come from the `.lookbook-glow`
 * utility (globals.css); color is always inline since it changes per
 * product (`theme_color`) and Tailwind can't express an arbitrary runtime
 * color via a class name.
 */
export default function LookbookGlow({ color, className = "" }: LookbookGlowProps) {
  return (
    <motion.div
      aria-hidden="true"
      className={`lookbook-glow ${className}`}
      style={{ backgroundColor: color }}
    />
  );
}
