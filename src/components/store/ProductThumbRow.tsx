"use client";

import Image from "next/image";
import type { Product } from "@/features/shared/types";

interface ProductThumbRowProps {
  products: Product[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

/**
 * 3–4 featured-product thumbnails below the Lookbook hero's content column.
 * Clicking one re-points `activeItem` in the parent (`useLookbookActiveItem`),
 * which morphs the glow/CTA/highlight color and crossfades the showcase image.
 */
export default function ProductThumbRow({
  products,
  activeId,
  onSelect,
}: ProductThumbRowProps) {
  if (products.length < 2) return null;

  return (
    <div className="flex items-center gap-3 mt-8">
      {products.slice(0, 4).map((product) => {
        const isActive = product.id === activeId;
        return (
          <button
            key={product.id}
            type="button"
            onClick={() => onSelect(product.id)}
            aria-label={product.name}
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
              <div className="w-full h-full bg-dark-800" />
            )}
          </button>
        );
      })}
    </div>
  );
}
