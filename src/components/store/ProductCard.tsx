"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import type { Product } from "@/features/shared/types";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

/**
 * Catalog card — image, name, price/compare-at-price, quick add-to-cart.
 * `onAddToCart` is optional: without it (e.g. if ever rendered before the
 * cart exists) the CTA falls back to a "عرض المنتج" link.
 */
export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [justAdded, setJustAdded] = useState(false);
  const hasDiscount =
    product.compare_at_price != null && product.compare_at_price > product.price;

  const handleAddToCart = () => {
    onAddToCart?.(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <div className="group relative flex flex-col rounded-2xl overflow-hidden neu-raised-sm bg-dark-800/40">
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-dark-800"
      >
        {product.main_image ? (
          <Image
            src={product.main_image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-dark-800" />
        )}
        {hasDiscount && (
          <span className="absolute top-3 start-3 rounded-full bg-brand-500 px-2.5 py-1 text-xs font-bold text-dark-950">
            خصم
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-1 font-medium text-gray-100 hover:text-brand-400 transition-colors"
        >
          {product.name}
        </Link>

        <div className="flex items-center gap-2">
          <span className="font-heading text-lg font-bold text-white">
            {product.price} ج.م
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-500 line-through">
              {product.compare_at_price} ج.م
            </span>
          )}
        </div>

        {onAddToCart ? (
          <button
            type="button"
            onClick={handleAddToCart}
            className={`mt-auto inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
              justAdded
                ? "bg-brand-500 text-dark-950"
                : "bg-brand-500/10 text-brand-400 hover:bg-brand-500/20"
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-4 h-4" />
                تمت الإضافة
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                أضف للسلة
              </>
            )}
          </button>
        ) : (
          <Link
            href={`/product/${product.slug}`}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500/10 py-2.5 text-sm font-semibold text-brand-400 transition-colors hover:bg-brand-500/20"
          >
            عرض المنتج
          </Link>
        )}
      </div>
    </div>
  );
}
