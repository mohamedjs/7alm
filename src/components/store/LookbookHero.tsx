"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, ShoppingBag } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/features/shared/types";
import { useLookbookActiveItem } from "@/features/store/store.hooks";
import LookbookGlow from "./LookbookGlow";
import ProductThumbRow from "./ProductThumbRow";
import { useCart } from "@/features/cart/cart.hooks";

interface LookbookHeroProps {
  featuredProducts: Product[];
}

const FALLBACK_ACCENT = "#06b6d4";

/**
 * The Dynamic Lookbook hero: a dark, immersive split layout where the
 * glow, CTA, and eyebrow underline re-color to match the currently
 * selected featured product's `theme_color` (CSS transitions only, no
 * framer-motion — see spec 007-b2c-ecommerce-storefront/plan.md).
 *
 * Content column is first in DOM order (sits inline-start in RTL); the
 * showcase column (glow + floating product image) follows.
 */
export default function LookbookHero({ featuredProducts }: LookbookHeroProps) {
  const { activeItem, setActiveId } = useLookbookActiveItem(featuredProducts);
  const accent = activeItem?.theme_color || FALLBACK_ACCENT;
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToCart = () => {
    if (!activeItem) return;
    addItem(
      {
        product_id: activeItem.id,
        name: activeItem.name,
        slug: activeItem.slug,
        main_image: activeItem.main_image,
        price: activeItem.price,
        theme_color: activeItem.theme_color,
      },
      1
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-44 lg:pb-28">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content column */}
          <div className="relative z-10 text-start">
            <span
              className="inline-block text-sm font-semibold tracking-wide mb-4 border-b-2 pb-1 transition-colors duration-500"
              style={{ color: accent, borderColor: accent }}
            >
              مجموعة مختارة
            </span>

            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] mb-6">
              {activeItem ? activeItem.name : "اكتشف مجموعتنا"}
            </h1>

            <p className="text-lg text-gray-400 max-w-md mb-8 leading-relaxed">
              {activeItem?.description ||
                "تسوق أحدث المنتجات المختارة بعناية، بجودة عالية وتوصيل لجميع أنحاء مصر."}
            </p>

            {activeItem && (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="inline-flex items-center gap-2 rounded-full px-8 py-4 font-bold text-dark-950 transition-all duration-500 hover:scale-105"
                  style={{ backgroundColor: accent }}
                >
                  {justAdded ? (
                    <>
                      <Check className="w-5 h-5" />
                      تمت الإضافة
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-5 h-5" />
                      أضف للسلة
                    </>
                  )}
                </button>
                <Link
                  href={`/product/${activeItem.slug}`}
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors underline underline-offset-4"
                >
                  عرض التفاصيل
                </Link>
              </div>
            )}

            <ProductThumbRow
              products={featuredProducts}
              activeId={activeItem?.id ?? null}
              onSelect={setActiveId}
            />
          </div>

          {/* Showcase column */}
          <div className="relative flex items-center justify-center min-h-[320px] lg:min-h-[480px]">
            <LookbookGlow color={accent} />
            {activeItem?.main_image && (
              <div key={activeItem.id} className="lookbook-morph relative z-10 float">
                <Image
                  src={activeItem.main_image}
                  alt={activeItem.name}
                  width={420}
                  height={420}
                  priority
                  className="w-full max-w-[320px] lg:max-w-[420px] h-auto object-contain drop-shadow-2xl"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
