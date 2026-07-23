"use client";

import { useMemo, useState } from "react";
import type { Product, Category } from "@/features/shared/types";
import { useLocale } from "@/features/i18n/i18n.hooks";
import { useCart } from "@/features/cart/cart.hooks";
import ProductCard from "../product/ProductCard";

interface ProductCollectionsProps {
  products: Product[];
  categories: Category[];
}

export default function ProductCollections({ products, categories }: ProductCollectionsProps) {
  const { t, locale } = useLocale();
  const { addItem } = useCart();
  const [activeTab, setActiveTab] = useState<string>("all");

  const activeProducts = useMemo(() => products.filter((p) => p.is_active), [products]);

  const visibleProducts = useMemo(() => {
    if (activeTab === "all") return activeProducts;
    return activeProducts.filter((p) => p.category_id === activeTab);
  }, [activeProducts, activeTab]);

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

  if (activeProducts.length === 0) return null;

  return (
    <section className="container mx-auto px-6 py-16 lg:py-24">
      <div className="mb-8 text-center">
        <h2 className="font-heading text-3xl lg:text-4xl font-extrabold text-text-primary mb-3">
          {t("store.home.collections")}
        </h2>
        <p className="text-text-muted">{t("store.home.collectionsSubtitle")}</p>
      </div>

      <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          aria-pressed={activeTab === "all"}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "all"
              ? "neu-pressed bg-surface text-brand-500"
              : "neu-raised bg-surface text-text-muted hover:text-text-primary"
          }`}
        >
          {t("store.home.collectionsAll")}
        </button>
        {categories.map((category) => {
          const catName = locale === "en" && category.name_en ? category.name_en : category.name_ar;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveTab(category.id)}
              aria-pressed={activeTab === category.id}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                activeTab === category.id
                  ? "neu-pressed bg-surface text-brand-500"
                  : "neu-raised bg-surface text-text-muted hover:text-text-primary"
              }`}
            >
              {catName}
            </button>
          );
        })}
      </div>

      {visibleProducts.length === 0 ? (
        <p className="text-center text-text-muted">{t("store.home.collectionsEmpty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
          ))}
        </div>
      )}
    </section>
  );
}
