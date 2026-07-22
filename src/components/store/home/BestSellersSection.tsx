"use client";

import type { Product } from "@/features/shared/types";
import { useCart } from "@/features/cart/cart.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";
import ProductCard from "../product/ProductCard";

interface BestSellersSectionProps {
  products: Product[];
}

/**
 * Home page "Best Sellers" section — products ranked by total order count
 * (`productService.getBestSellerProducts`, see `page.tsx`). Reuses
 * `ProductCard` (same catalog card as every other store surface) inside a
 * light bento-ish grid: the #1 seller gets a wider tile at `sm+`, and the
 * top three carry a small neumorphic rank badge. Owns its own cart wiring
 * like `ProductGrid` does, since it's the client boundary receiving plain
 * `products` data from the server `page.tsx`.
 */
export default function BestSellersSection({ products }: BestSellersSectionProps) {
  const { addItem } = useCart();
  const { t } = useLocale();

  if (products.length === 0) return null;

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

  return (
    <section className="container mx-auto px-6 py-16 lg:py-24">
      <div className="mb-10 text-center">
        <h2 className="font-heading text-3xl lg:text-4xl font-extrabold text-text-primary mb-3">
          {t("store.home.bestSellers")}
        </h2>
        <p className="text-text-muted">{t("store.home.bestSellersSubtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
        {products.map((product, index) => (
          <div
            key={product.id}
            className={index === 0 ? "col-span-2 sm:col-span-2" : ""}
          >
            <div className="relative">
              {index < 3 && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-3 end-3 z-20 flex h-7 w-7 items-center justify-center rounded-full neu-raised-sm bg-surface text-xs font-bold text-brand-600 dark:text-brand-400"
                >
                  #{index + 1}
                </span>
              )}
              <ProductCard product={product} onAddToCart={handleAddToCart} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
