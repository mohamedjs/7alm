"use client";

import { useLocale } from "@/features/i18n/i18n.hooks";
import type { Category } from "@/features/shared/types";

interface CategoryLabelProps {
  /** `null` renders the "uncategorized/other" fallback label. */
  category: Category | null;
  as?: "span" | "h1" | "h2" | "h3";
  className?: string;
}

/**
 * Locale-aware category name — picks the DB's own `name_en`/`name_ar`
 * field per the active locale (falling back to `name_ar` if `name_en` is
 * empty) rather than machine-translating. This is data selection, not
 * content localization, so it stays inside the "chrome-only translation"
 * boundary (spec Assumptions / 006's documented scope boundary) while
 * still avoiding an Arabic-only category name sitting next to
 * English chrome once the visitor switches locale.
 *
 * Extracted as a tiny client component (rather than inlining the
 * `locale === "en" && ... : ...` ternary at every call site) so
 * server-rendered pages (`products/page.tsx`, `category/[slug]/page.tsx`)
 * can render locale-correct category headings without themselves being
 * client components.
 */
export default function CategoryLabel({ category, as = "span", className }: CategoryLabelProps) {
  const { t, locale } = useLocale();
  const Tag = as;
  const label = category
    ? locale === "en" && category.name_en
      ? category.name_en
      : category.name_ar
    : t("store.products.uncategorized");
  return <Tag className={className}>{label}</Tag>;
}
