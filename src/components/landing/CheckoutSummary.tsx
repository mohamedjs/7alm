"use client";

import { useUrgencyBanner } from "@/features/checkout/checkout-summary.hooks";
import ProductGallery from "./ProductGallery";

interface CheckoutSummaryProps {
  productName: string;
  productPrice: number;
  compareAtPrice: number | null;
  discountPercent: number | null;
  description: string | null;
  gallery: string[];
}

export default function CheckoutSummary({
  productName,
  productPrice,
  compareAtPrice,
  discountPercent,
  description,
  gallery,
}: CheckoutSummaryProps) {
  const { time, viewers } = useUrgencyBanner();

  return (
    <div className="space-y-6">
      {/* Urgency Banner */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
          </span>
          <p className="text-red-700 font-bold text-sm">
            عرض لفترة محدودة! سينتهي في:
          </p>
        </div>
        <div className="flex items-center gap-2" dir="ltr">
          <div className="bg-white text-red-600 font-mono font-bold px-3 py-1.5 rounded-lg border border-red-200 shadow-sm">
            {time.h}
          </div>
          <span className="text-red-500 font-bold">:</span>
          <div className="bg-white text-red-600 font-mono font-bold px-3 py-1.5 rounded-lg border border-red-200 shadow-sm">
            {time.m}
          </div>
          <span className="text-red-500 font-bold">:</span>
          <div className="bg-white text-red-600 font-mono font-bold px-3 py-1.5 rounded-lg border border-red-200 shadow-sm">
            {time.s}
          </div>
        </div>
      </div>

      {/* Viewers Alert */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-4 flex items-center gap-3 border-r-4 border-r-brand-500">
        <span className="text-2xl">🔥</span>
        <p className="text-gray-600 text-sm">
          أسرع! <strong className="text-gray-900">{viewers} شخص</strong>{" "}
          يشاهدون هذا المنتج الآن.
        </p>
      </div>

      {/* Product Card */}
      <div className="bg-white shadow-lg border border-gray-100 rounded-3xl p-4 sm:p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -z-10" />

        {/* Gallery Component */}
        <ProductGallery
          gallery={gallery}
          productName={productName}
          discountPercent={discountPercent}
        />

        {/* Info */}
        <div className="space-y-4 mt-6">
          <h2 className="font-heading text-2xl lg:text-3xl font-bold text-gray-900">
            {productName}
          </h2>

          <div className="flex items-end gap-3 pb-4 border-b border-gray-100">
            <span className="text-4xl font-bold text-gray-900">
              {productPrice}{" "}
              <span className="text-lg text-gray-500 font-normal">ج.م</span>
            </span>
            {compareAtPrice && (
              <span className="text-lg text-gray-400 line-through mb-1">
                {compareAtPrice} ج.م
              </span>
            )}
          </div>

          {description && (
            <div className="pt-2">
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: "🚚", text: "شحن سريع" },
          { icon: "🛡️", text: "ضمان جودة" },
          { icon: "💵", text: "الدفع عند الاستلام" },
        ].map((badge, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-3 flex flex-col items-center justify-center gap-1 text-center border border-gray-100 shadow-sm"
          >
            <span className="text-2xl">{badge.icon}</span>
            <span className="text-xs text-gray-600 font-medium">
              {badge.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
