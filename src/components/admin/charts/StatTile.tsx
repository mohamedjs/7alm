"use client";

import { useLocale } from "@/features/i18n/i18n.hooks";

interface StatTileProps {
  label: string;
  value: string;
  accentClassName?: string;
  /** Signed percentage change vs the previous period, e.g. 0.12 for +12%. */
  delta?: number | null;
  /** Overrides the default "vs previous period" caption (already localized). */
  deltaLabel?: string;
  /** "lg" renders the bento hero tile treatment (bigger type/padding). Default "sm". */
  size?: "sm" | "lg";
  /** Extra classes on the outer card, e.g. bento grid col/row-span utilities. */
  className?: string;
  /** Optional inline content below the value (e.g. hero-card action buttons). */
  children?: React.ReactNode;
}

export default function StatTile({
  label,
  value,
  accentClassName = "text-text-primary",
  delta,
  deltaLabel,
  size = "sm",
  className = "",
  children,
}: StatTileProps) {
  const { t } = useLocale();
  const showDelta = typeof delta === "number" && Number.isFinite(delta);
  const deltaUp = showDelta && delta! >= 0;
  const isLg = size === "lg";
  const resolvedDeltaLabel = deltaLabel ?? t("dashboard.deltaVsPrevious");

  return (
    <div
      className={`h-full flex flex-col justify-between rounded-2xl border border-border bg-surface-raised shadow-sm transition-colors ${
        isLg ? "p-5 sm:p-7" : "p-4 sm:p-6"
      } ${className}`}
    >
      <div>
        <p className={`text-text-muted font-medium mb-1 ${isLg ? "text-sm" : "text-xs sm:text-sm"}`}>
          {label}
        </p>
        <p
          className={`font-semibold tabular-nums ${isLg ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"} ${accentClassName}`}
        >
          {value}
        </p>
        {showDelta && (
          <p className="mt-2 text-xs text-text-muted">
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${
                deltaUp ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              }`}
            >
              {deltaUp ? "▲" : "▼"} {Math.abs(delta! * 100).toFixed(0)}%
            </span>{" "}
            {resolvedDeltaLabel}
          </p>
        )}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
