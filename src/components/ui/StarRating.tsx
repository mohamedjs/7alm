"use client";

import { Star } from "lucide-react";

export interface StarRatingProps {
  /** Current rating, 0-5 (fractional allowed in read-only mode for averages). */
  value: number;
  /** Omit (or pass nothing) for a read-only display; provide to make it an input. */
  onChange?: (value: number) => void;
  /** Pixel size of each star. */
  size?: number;
  ariaLabel?: string;
}

const STARS = [1, 2, 3, 4, 5];

/**
 * Small self-contained 1-5 star rating — read-only (aggregate display) or
 * interactive (review submission picker). No new deps: `Star` comes from
 * `lucide-react`, already used throughout the app.
 */
export default function StarRating({ value, onChange, size = 20, ariaLabel }: StarRatingProps) {
  const filledClass = "fill-amber-400 text-amber-400";
  const emptyClass = "fill-none text-border";

  if (!onChange) {
    return (
      <div className="flex items-center gap-0.5" role="img" aria-label={ariaLabel}>
        {STARS.map((n) => (
          <Star
            key={n}
            width={size}
            height={size}
            className={n <= Math.round(value) ? filledClass : emptyClass}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={ariaLabel}>
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          role="radio"
          aria-checked={value === n}
          aria-label={String(n)}
          className="transition-transform hover:scale-110"
        >
          <Star width={size} height={size} className={n <= value ? filledClass : emptyClass} />
        </button>
      ))}
    </div>
  );
}
