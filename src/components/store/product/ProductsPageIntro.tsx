"use client";

import { useLocale } from "@/features/i18n/i18n.hooks";

interface ProductsPageIntroProps {
  count: number;
}

/**
 * `/products` page heading + result count — a tiny client component so
 * the heading is locale-reactive even though the page itself is a Server
 * Component (the count is computed server-side and passed down as a
 * plain number prop).
 */
export default function ProductsPageIntro({ count }: ProductsPageIntroProps) {
  const { t } = useLocale();

  return (
    <div className="mb-12">
      <h1 className="font-heading text-3xl lg:text-4xl font-extrabold text-text-primary mb-2">
        {t("store.products.title")}
      </h1>
      <p className="text-text-muted">
        {count > 0
          ? t("store.products.countAvailable").replace("{count}", String(count))
          : t("store.products.noProducts")}
      </p>
    </div>
  );
}
