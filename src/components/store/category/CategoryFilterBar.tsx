"use client";

import { useLocale } from "@/features/i18n/i18n.hooks";
import type { ProductSortOption } from "@/features/store/store.hooks";

interface CategoryFilterBarProps {
  sort: ProductSortOption;
  onSortChange: (sort: ProductSortOption) => void;
  inStockOnly: boolean;
  onInStockOnlyChange: (value: boolean) => void;
  resultCount: number;
}

const SORT_OPTIONS: { value: ProductSortOption; labelKey: "store.category.sort.newest" | "store.category.sort.priceAsc" | "store.category.sort.priceDesc" }[] = [
  { value: "newest", labelKey: "store.category.sort.newest" },
  { value: "price-asc", labelKey: "store.category.sort.priceAsc" },
  { value: "price-desc", labelKey: "store.category.sort.priceDesc" },
];

/**
 * Neumorphic segmented-pill filter/sort bar (refinement B, 008 redo) —
 * the exact `bg-surface … neu-pressed-sm` container / `neu-raised-sm
 * bg-brand-500` active-segment pattern already proven in the admin
 * overview's range-preset pills (`(admin)/admin/page.tsx`'s
 * `RANGE_PRESETS` control) and Image 2's segmented pill-tab motif —
 * reused here rather than inventing a new control.
 */
export default function CategoryFilterBar({
  sort,
  onSortChange,
  inStockOnly,
  onInStockOnlyChange,
  resultCount,
}: CategoryFilterBarProps) {
  const { t } = useLocale();

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-3 neu-raised-sm sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-0.5 rounded-xl bg-surface p-0.5 neu-pressed-sm">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSortChange(option.value)}
              aria-pressed={sort === option.value}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
                sort === option.value
                  ? "neu-raised-sm bg-brand-500 text-white"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onInStockOnlyChange(!inStockOnly)}
          aria-pressed={inStockOnly}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
            inStockOnly
              ? "neu-raised-sm bg-brand-500 text-white"
              : "bg-surface text-text-muted neu-pressed-sm hover:text-text-primary"
          }`}
        >
          {t("store.category.filter.inStockOnly")}
        </button>
      </div>

      <span className="shrink-0 text-xs font-medium text-text-muted sm:text-sm">
        {t("store.products.countAvailable").replace("{count}", String(resultCount))}
      </span>
    </div>
  );
}
