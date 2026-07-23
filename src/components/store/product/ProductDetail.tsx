"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import type { Product, QuantityPriceTier } from "@/features/shared/types";
import { useCart } from "@/features/cart/cart.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface ProductDetailProps {
  product: Product;
}

/**
 * Store product-detail client island: gallery, price (flat or quantity-tier),
 * quantity stepper, add-to-cart. Token-driven + bilingual.
 *
 * When `product.quantity_prices` has tiers, a tier selector (ported from the
 * landing page's `QuantityPricing`) replaces the manual quantity stepper —
 * the selected tier's `min_quantity` becomes the cart quantity, and its
 * `price` is the bundle total for that quantity (matches
 * `orders.service.ts#calculateLineTotal`, which resolves the same tier by
 * `quantity === tier.min_quantity`). Otherwise, a flat price + optional
 * compare-at-price/discount badge is shown with the manual stepper.
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

  const tiers = useMemo(() => product.quantity_prices ?? [], [product.quantity_prices]);
  const hasTiers = tiers.length > 0;
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const selectedTier: QuantityPriceTier | null = hasTiers
    ? (tiers[selectedTierIndex] ?? tiers[0])
    : null;

  // Best-value tier = lowest bundle price among tiers flagged `is_special`.
  const bestValueIndex = useMemo(() => {
    if (!hasTiers) return -1;
    const special = tiers
      .map((tier, index) => ({ tier, index }))
      .filter(({ tier }) => tier.is_special);
    if (special.length === 0) return -1;
    return special.reduce((best, current) =>
      current.tier.price < best.tier.price ? current : best
    ).index;
  }, [tiers, hasTiers]);

  const hasFlatDiscount =
    !hasTiers && product.compare_at_price != null && product.compare_at_price > product.price;
  const flatDiscountPercent = hasFlatDiscount
    ? Math.round(
        ((product.compare_at_price! - product.price) / product.compare_at_price!) * 100
      )
    : null;

  const cartQuantity = selectedTier ? selectedTier.min_quantity : quantity;
  // Cart stores a per-unit price; multiplying back by cartQuantity must equal
  // the tier's bundle total so the cart subtotal matches server-side pricing.
  const cartUnitPrice = selectedTier ? selectedTier.price / selectedTier.min_quantity : product.price;

  const handleAddToCart = () => {
    addItem(
      {
        product_id: product.id,
        name: product.name,
        slug: product.slug,
        main_image: product.main_image,
        price: cartUnitPrice,
        theme_color: product.theme_color,
      },
      cartQuantity
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

        {hasTiers ? (
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">💰</span>
              <h2 className="font-heading text-lg font-bold text-text-primary">
                {t("store.detail.buyMoreSave")}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {tiers.map((tier, index) => {
                const isSelected = index === selectedTierIndex;
                const isBestValue = index === bestValueIndex;
                const tierDiscountPercent = tier.compare_at_price
                  ? Math.round(
                      ((tier.compare_at_price - tier.price) / tier.compare_at_price) * 100
                    )
                  : null;

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedTierIndex(index)}
                    aria-pressed={isSelected}
                    className={`relative rounded-2xl p-4 text-center transition-all duration-200 ${
                      isSelected ? "neu-pressed-sm" : "neu-raised-sm hover:-translate-y-0.5"
                    } ${tier.is_special ? "bg-brand-500/5" : ""}`}
                    style={
                      isBestValue
                        ? { outline: "2px solid #fbbf24", outlineOffset: "2px" }
                        : undefined
                    }
                  >
                    {isBestValue ? (
                      <span className="absolute -top-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 whitespace-nowrap rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-md">
                        ⭐ {t("store.detail.bestValue")}
                      </span>
                    ) : (
                      tier.is_special && (
                        <span className="absolute -top-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 whitespace-nowrap rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white shadow-md">
                          {t("store.detail.specialOffer")}
                        </span>
                      )
                    )}

                    <div className="mb-1 text-sm font-bold text-text-primary">{tier.label}</div>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="text-2xl font-bold text-text-primary">{tier.price}</span>
                      <span className="text-sm font-normal text-text-muted">
                        {t("store.product.currency")}
                      </span>
                    </div>

                    {tier.compare_at_price != null && (
                      <div className="mt-1">
                        <span className="text-sm text-text-muted line-through">
                          {tier.compare_at_price} {t("store.product.currency")}
                        </span>
                        {tierDiscountPercent != null && (
                          <span className="ms-2 text-xs font-bold text-danger">
                            -{tierDiscountPercent}%
                          </span>
                        )}
                      </div>
                    )}

                    {tier.min_quantity > 1 && (
                      <div className="mt-2 border-t border-border pt-2 text-xs text-text-muted">
                        {t("store.detail.perUnit")}:{" "}
                        <span className="font-bold text-text-primary">
                          {(tier.price / tier.min_quantity).toFixed(0)} {t("store.product.currency")}
                        </span>
                      </div>
                    )}

                    {isSelected && (
                      <span className="absolute top-2 end-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500">
                        <Check className="h-3 w-3 text-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-6">
            <span className="font-heading text-2xl font-bold text-text-primary">
              {product.price} {t("store.product.currency")}
            </span>
            {hasFlatDiscount && (
              <>
                <span className="text-lg text-text-muted line-through">
                  {product.compare_at_price} {t("store.product.currency")}
                </span>
                <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-bold text-danger">
                  -{flatDiscountPercent}%
                </span>
              </>
            )}
          </div>
        )}

        {product.description && (
          <p className="text-text-muted leading-relaxed mb-8">{product.description}</p>
        )}

        {!hasTiers && (
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
        )}

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
