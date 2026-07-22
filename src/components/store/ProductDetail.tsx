"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import type { Product } from "@/features/shared/types";
import { useCart } from "@/features/cart/cart.hooks";

interface ProductDetailProps {
  product: Product;
}

/**
 * Store product-detail client island: gallery, price, quantity stepper,
 * add-to-cart.
 */
export default function ProductDetail({ product }: ProductDetailProps) {
  const { addItem } = useCart();
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
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-dark-800 neu-raised-sm">
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
        <h1 className="font-heading text-3xl lg:text-4xl font-extrabold text-white mb-4">
          {product.name}
        </h1>

        <div className="flex items-center gap-3 mb-6">
          <span className="font-heading text-2xl font-bold text-white">
            {product.price} ج.م
          </span>
          {hasDiscount && (
            <span className="text-lg text-gray-500 line-through">
              {product.compare_at_price} ج.م
            </span>
          )}
        </div>

        {product.description && (
          <p className="text-gray-400 leading-relaxed mb-8">{product.description}</p>
        )}

        <div className="flex items-center gap-4 mb-8">
          <span className="text-sm font-medium text-gray-400">الكمية</span>
          <div className="flex items-center gap-3 rounded-xl neu-pressed-sm px-3 py-2">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="تقليل الكمية"
              className="text-gray-300 hover:text-white transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center text-white font-medium">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="زيادة الكمية"
              className="text-gray-300 hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          className={`inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 font-bold transition-colors ${
            justAdded ? "bg-brand-500 text-dark-950" : "bg-brand-500 hover:bg-brand-400 text-dark-950"
          }`}
        >
          {justAdded ? (
            <>
              <Check className="w-5 h-5" />
              تمت الإضافة للسلة
            </>
          ) : (
            <>
              <ShoppingBag className="w-5 h-5" />
              أضف للسلة
            </>
          )}
        </button>
      </div>
    </div>
  );
}
