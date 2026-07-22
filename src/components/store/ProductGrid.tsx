"use client";

import type { Product } from "@/features/shared/types";
import { useCart } from "@/features/cart/cart.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
}

/**
 * Responsive product grid with loading/empty states. Owns the cart wiring
 * itself (a client component receiving only serializable `products` data
 * from its — usually server — parent) so every catalog surface gets a
 * working quick add-to-cart for free.
 */
export default function ProductGrid({
  products,
  isLoading = false,
}: ProductGridProps) {
  const { addItem } = useCart();
  const { t } = useLocale();

  const handleAddToCart = (product: Product) => {
    addItem(
      {
        product_id: product.id,
        name: product.name,
        slug: product.slug,
        main_image: product.main_image,
        price: product.price,
        theme_color: product.theme_color,
      },
      1
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-2xl bg-surface-raised animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-border py-16 text-center text-text-muted">
        {t("store.product.noProducts")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
      ))}
    </div>
  );
}
