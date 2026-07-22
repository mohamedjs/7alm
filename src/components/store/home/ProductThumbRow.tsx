"use client";

import Image from "next/image";
import type { Product } from "@/features/shared/types";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface ProductThumbRowProps {
  products: Product[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

/**
 * 3–4 featured-product thumbnails below the Lookbook hero's content column.
 * Repurposed to serve as a section dot-nav for the scroll-linked hero.
 */
export default function ProductThumbRow({
  products,
  activeIndex,
  onSelect,
}: ProductThumbRowProps) {
  const { t } = useLocale();
  if (products.length < 2) return null;

  return (
    <div className="flex items-center gap-3 mt-8">
      {products.slice(0, 4).map((product, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={product.id}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={product.name || t("store.hero.viewDetails")}
            aria-pressed={isActive}
            className={`relative w-16 h-16 rounded-2xl overflow-hidden transition-all duration-300 ${
              isActive ? "scale-105" : "opacity-50 hover:opacity-90"
            }`}
            style={
              isActive
                ? { boxShadow: `0 0 0 2px ${product.theme_color}` }
                : undefined
            }
          >
            {product.main_image ? (
              <Image
                src={product.main_image}
                alt={product.name}
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-surface-raised" />
            )}
          </button>
        );
      })}
    </div>
  );
}
