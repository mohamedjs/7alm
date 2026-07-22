"use client";

import type { Product } from "@/features/shared/types";
import { useCart } from "@/features/cart/cart.hooks";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  emptyMessage?: string;
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
  emptyMessage = "لا توجد منتجات هنا حالياً.",
}: ProductGridProps) {
  const { addItem } = useCart();

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
            className="aspect-square rounded-2xl bg-dark-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 py-16 text-center text-gray-500">
        {emptyMessage}
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
