"use client";

import { useState, useRef } from "react";
import CheckoutForm from "./CheckoutForm";
import ProductGallery from "./ProductGallery";
import QuantityPricing from "./QuantityPricing";
import type { Product } from "@/features/shared/types";
import { Star, ShieldCheck, Truck } from "lucide-react";

interface ProductCheckoutFunnelProps {
  product: Product;
  discountPercent: number | null;
  gallery: string[];
}

export default function ProductCheckoutFunnel({
  product,
  discountPercent,
  gallery,
}: ProductCheckoutFunnelProps) {
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-gray-50 min-h-screen text-right" dir="rtl">
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm p-3 flex justify-between items-center">
        <h2 className="text-sm font-bold text-gray-800 line-clamp-1 flex-1 me-4">
          {product.name}
        </h2>
        <button
          onClick={scrollToForm}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-md transition-all shrink-0"
        >
          اطلب الآن
        </button>
      </div>

      <div className="max-w-3xl mx-auto pb-24">
        {/* Main Content Area */}
        <div className="bg-white">
          {/* Gallery */}
          <div className="mb-4">
            <ProductGallery gallery={gallery} productName={product.name} discountPercent={discountPercent} />
          </div>

          <div className="p-4 space-y-6">
            {/* Title & Reviews */}
            <div>
              <div className="flex items-center gap-1 mb-2 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
                <span className="text-xs text-gray-500 ms-2 font-medium">(4.9/5)</span>
              </div>
              <h1 className="text-2xl font-black text-gray-900 leading-tight">
                {product.name}
              </h1>
            </div>

            {/* Price Block */}
            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between border border-gray-100">
              <div className="flex flex-col">
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-amber-600">
                    {product.price}
                  </span>
                  <span className="text-lg font-bold text-gray-600 mb-1">ج.م</span>
                </div>
                {product.compare_at_price && (
                  <span className="text-sm text-gray-400 line-through">
                    {product.compare_at_price} ج.م
                  </span>
                )}
              </div>
              {discountPercent && discountPercent > 0 && (
                <div className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-black text-sm border border-red-200">
                  خصم {discountPercent}%
                </div>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                {product.description}
              </div>
            )}

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-3 py-2 border-y border-gray-100">
              <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg justify-center">
                <Truck className="w-5 h-5 shrink-0" />
                <span className="text-sm">شحن سريع</span>
              </div>
              <div className="flex items-center gap-2 text-blue-600 font-bold bg-blue-50 p-2 rounded-lg justify-center">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span className="text-sm">الدفع عند الاستلام</span>
              </div>
            </div>

            {/* Quantity Offers */}
            {product.quantity_prices && product.quantity_prices.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-6 bg-amber-500 rounded-full inline-block"></span>
                  عروض الكميات
                </h3>
                <QuantityPricing
                  tiers={product.quantity_prices}
                  basePrice={product.price}
                  baseCompareAtPrice={product.compare_at_price}
                  onSelectTier={(tier) => setSelectedQuantity(tier.min_quantity)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Checkout Form Section */}
        <div ref={formRef} className="p-4 mt-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
              أدخل بياناتك لإتمام الطلب
            </h3>
            <CheckoutForm productId={product.id} quantity={selectedQuantity} />
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar (Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 animate-slide-up">
        <button
          onClick={scrollToForm}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-xl font-black text-lg shadow-lg shadow-amber-500/30 transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
        >
          اطلب الآن
          <span className="text-amber-100 text-sm font-medium">
            ({product.price * selectedQuantity} ج.م)
          </span>
        </button>
      </div>
    </div>
  );
}
