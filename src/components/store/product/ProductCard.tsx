"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import type { Product } from "@/features/shared/types";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

/**
 * Catalog card — neumorphic surface with image, name, price/compare-at-price,
 * quick add-to-cart. Hover lift mirrors `.neu-btn`'s hover transform.
 */
export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [justAdded, setJustAdded] = useState(false);
  const { t } = useLocale();
  const hasDiscount =
    product.compare_at_price != null && product.compare_at_price > product.price;

  const handleAddToCart = () => {
    onAddToCart?.(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <div className="group relative flex flex-col rounded-2xl overflow-hidden neu-raised-sm bg-surface transition-transform duration-200 hover:-translate-y-1">
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-surface"
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
          <div className="w-full h-full bg-surface" />
        )}
        {hasDiscount && (
          <span className="absolute top-3 start-3 rounded-full bg-brand-500 px-2.5 py-1 text-xs font-bold text-white">
            {t("store.product.discount")}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-1 font-medium text-text-primary hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        >
          {product.name}
        </Link>

        <div className="flex items-center gap-2">
          <span className="font-heading text-lg font-bold text-text-primary">
            {product.price} {t("store.product.currency")}
          </span>
          {hasDiscount && (
            <span className="text-sm text-text-muted line-through">
              {product.compare_at_price} {t("store.product.currency")}
            </span>
          )}
        </div>

        {onAddToCart ? (
          <button
            type="button"
            onClick={handleAddToCart}
            className={`mt-auto inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              justAdded
                ? "bg-brand-500 text-white neu-btn"
                : "bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20"
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-4 h-4" />
                {t("store.product.added")}
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                {t("store.product.addToCart")}
              </>
            )}
          </button>
        ) : (
          <Link
            href={`/product/${product.slug}`}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500/10 py-2.5 text-sm font-semibold text-brand-600 dark:text-brand-400 transition-colors hover:bg-brand-500/20"
          >
            {t("store.product.viewProduct")}
          </Link>
        )}
      </div>
    </div>
  );
}
