"use client";

/**
 * 7alm brand wordmark — a premium inline SVG that renders the "7" as a
 * bold stylised numeral with a subtle gradient accent and the "alm" as
 * clean geometric lettering. Designed to feel modern, luxurious and
 * tech-forward at small sizes (navbar) while scaling cleanly.
 *
 * The SVG uses `currentColor` for the base text and an explicit
 * brand-gradient fill for the "7" so it picks up theme tokens
 * automatically (light vs dark).
 *
 * Props:
 * - `className` — forwarded to the wrapping `<svg>` for sizing.
 */
interface BrandLogoProps {
  className?: string;
}

export default function BrandLogo({ className = "" }: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 260 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="7alm"
      role="img"
    >
      <defs>
        {/* Brand gradient for the "7" numeral */}
        <linearGradient id="brand-seven-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-brand-400, #22d3ee)" />
          <stop offset="100%" stopColor="var(--color-brand-600, #0891b2)" />
        </linearGradient>
      </defs>

      {/* ---- "7" — bold geometric numeral with gradient fill ---- */}
      <path
        d="M4 8 H52 L24 64 H12 L38 16 H4 Z"
        fill="url(#brand-seven-grad)"
      />
      {/* Small accent dot on the "7" (Arabic diacritical feel) */}
      <circle cx="28" cy="4" r="3.5" fill="url(#brand-seven-grad)" />

      {/* ---- "a" ---- */}
      <path
        d="M68 44 Q68 30 80 30 Q92 30 92 44 L92 64 L80 64 L80 60 Q76 64 70 64 Q62 64 62 56 Q62 48 72 48 L80 48 L80 44 Q80 38 74 38 Q68 38 68 44 Z M72 54 Q72 58 76 58 Q80 58 80 54 L80 52 L74 52 Q72 52 72 54 Z"
        fill="currentColor"
      />

      {/* ---- "l" ---- */}
      <path
        d="M104 12 L116 12 L116 64 L104 64 Z"
        fill="currentColor"
      />

      {/* ---- "m" ---- */}
      <path
        d="M130 30 L142 30 L142 36 Q146 30 154 30 Q162 30 164 36 Q168 30 176 30 Q188 30 188 44 L188 64 L176 64 L176 46 Q176 38 170 38 Q164 38 164 46 L164 64 L152 64 L152 46 Q152 38 146 38 Q142 38 142 46 L142 64 L130 64 Z"
        fill="currentColor"
      />

      {/* ---- Decorative accent bar underneath ---- */}
      <rect
        x="4"
        y="68"
        width="56"
        height="3"
        rx="1.5"
        fill="url(#brand-seven-grad)"
        opacity="0.5"
      />
    </svg>
  );
}
