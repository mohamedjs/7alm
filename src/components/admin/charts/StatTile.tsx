"use client";

interface StatTileProps {
  label: string;
  value: string;
  accentClassName?: string;
  /** Signed percentage change vs the previous period, e.g. 0.12 for +12%. */
  delta?: number | null;
  deltaLabel?: string;
}

export default function StatTile({
  label,
  value,
  accentClassName = "text-gray-900",
  delta,
  deltaLabel = "vs previous period",
}: StatTileProps) {
  const showDelta = typeof delta === "number" && Number.isFinite(delta);
  const deltaUp = showDelta && delta! >= 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
      <p className="text-gray-500 text-xs sm:text-sm font-medium mb-1">{label}</p>
      <p className={`text-2xl sm:text-3xl font-semibold ${accentClassName}`}>
        {value}
      </p>
      {showDelta && (
        <p className="mt-1 text-xs text-gray-500">
          <span
            className={deltaUp ? "font-medium text-[#006300]" : "font-medium text-[#d03b3b]"}
          >
            {deltaUp ? "▲" : "▼"} {Math.abs(delta! * 100).toFixed(0)}%
          </span>{" "}
          {deltaLabel}
        </p>
      )}
    </div>
  );
}
