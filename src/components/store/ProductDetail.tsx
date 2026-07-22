"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import type { Product } from "@/features/shared/types";
import { useCart } from "@/features/cart/cart.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface ProductDetailProps {
  product: Product;
}

/**
 * Store product-detail client island: gallery, price, quantity stepper,
 * add-to-cart. Token-driven + bilingual.
 */
export default function ProductDetail({ product }: ProductDetailProps) {
  const { addItem } = useCart();
  const { t } = useLocale();
  const gallery = [
    ...(product.main_image ? [product.main_image] : []),
    ...(product.gallery || []),
  ];
  const [activeImage, setActiveImage] = useState(gallery[0] ?? null);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const hasDiscount =
    product.compare_at_price != null && product.compare_at_price > product.price;

  const handleAddToCart = () => {
    addItem(
      {
        product_id: product.id,
        name: product.name,
        slug: product.slug,
        main_image: product.main_image,
        price: product.price,
        theme_color: product.theme_color,
      },
      quantity
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
      {/* Gallery */}
      <div>
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-surface neu-raised-sm">
          {activeImage ? (
            <Image
              src={activeImage}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full" />
          )}
        </div>
        {gallery.length > 1 && (
          <div className="flex items-center gap-3 mt-4">
            {gallery.map((image) => (
              <button
                key={image}
                type="button"
                onClick={() => setActiveImage(image)}
                className={`relative w-16 h-16 rounded-xl overflow-hidden transition-opacity ${
                  image === activeImage ? "opacity-100" : "opacity-50 hover:opacity-80"
                }`}
              >
                <Image src={image} alt={product.name} fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-start">
        <h1 className="font-heading text-3xl lg:text-4xl font-extrabold text-text-primary mb-4">
          {product.name}
        </h1>

        <div className="flex items-center gap-3 mb-6">
          <span className="font-heading text-2xl font-bold text-text-primary">
            {product.price} {t("store.product.currency")}
          </span>
          {hasDiscount && (
            <span className="text-lg text-text-muted line-through">
              {product.compare_at_price} {t("store.product.currency")}
            </span>
          )}
        </div>

        {product.description && (
          <p className="text-text-muted leading-relaxed mb-8">{product.description}</p>
        )}

        <div className="flex items-center gap-4 mb-8">
          <span className="text-sm font-medium text-text-muted">{t("store.detail.quantity")}</span>
          <div className="flex items-center gap-3 rounded-xl neu-pressed-sm px-3 py-2">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label={t("store.cart.decreaseQty")}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center text-text-primary font-medium">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label={t("store.cart.increaseQty")}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-8 py-4 font-bold text-white transition-all neu-btn"
        >
          {justAdded ? (
            <>
              <Check className="w-5 h-5" />
              {t("store.detail.added")}
            </>
          ) : (
            <>
              <ShoppingBag className="w-5 h-5" />
              {t("store.detail.addToCart")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
