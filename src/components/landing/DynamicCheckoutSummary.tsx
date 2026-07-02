"use client";

import Image from "next/image";
import { useUrgencyBanner } from "@/features/checkout/checkout-summary.hooks";
import { useState } from "react";
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Navigation, Thumbs } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/navigation';
import 'swiper/css/thumbs';
import type { Swiper as SwiperType } from 'swiper';

interface DynamicCheckoutSummaryProps {
  productName: string;
  productPrice: number;
  compareAtPrice: number | null;
  discountPercent: number | null;
  description: string | null;
  gallery: string[];
}

export default function DynamicCheckoutSummary({
  productName,
  productPrice,
  compareAtPrice,
  discountPercent,
  description,
  gallery,
}: DynamicCheckoutSummaryProps) {
  const { time, viewers } = useUrgencyBanner();
  const [activeImage, setActiveImage] = useState(gallery[0] || "");
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);

  const imageFallback = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.style.display = "none";
    if (target.parentElement) {
      const fallback = document.createElement("div");
      fallback.className =
        "w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400";
      fallback.innerHTML = `<svg class="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span>صورة المنتج</span>`;
      target.parentElement.appendChild(fallback);
    }
  };

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
      <div className="bg-white shadow-lg border border-gray-100 rounded-3xl p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -z-10" />

        {/* Main Image Swiper */}
        {gallery.length > 0 ? (
          <>
            <div className="relative rounded-2xl overflow-hidden mb-4 border border-gray-100 group">
              {discountPercent && (
                <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full z-10 shadow-lg">
                  خصم {discountPercent}%
                </div>
              )}
              <Swiper
                spaceBetween={10}
                navigation={true}
                thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
                modules={[FreeMode, Navigation, Thumbs]}
                className="w-full aspect-[4/3] rounded-2xl"
              >
                {gallery.map((img, idx) => (
                  <SwiperSlide key={idx}>
                    <div className="relative w-full h-full">
                      <Image
                        src={img}
                        alt={`${productName} ${idx + 1}`}
                        fill
                        className="object-cover"
                        onError={imageFallback}
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>

            {/* Thumbnails Swiper */}
            {gallery.length > 1 && (
              <div className="mb-6">
                <Swiper
                  onSwiper={setThumbsSwiper}
                  spaceBetween={10}
                  slidesPerView={4}
                  freeMode={true}
                  watchSlidesProgress={true}
                  modules={[FreeMode, Navigation, Thumbs]}
                  className="thumbs-swiper h-20"
                >
                  {gallery.map((img, idx) => (
                    <SwiperSlide key={`thumb-${idx}`} className="opacity-60 transition-opacity cursor-pointer !w-20">
                      <div className="relative w-full h-full rounded-xl overflow-hidden border-2 border-gray-200">
                        <Image
                          src={img}
                          alt={`${productName} thumbnail ${idx + 1}`}
                          fill
                          className="object-cover"
                          onError={imageFallback}
                        />
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            )}
          </>
        ) : activeImage && (
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 border border-gray-100 group">
            {discountPercent && (
              <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full z-10 shadow-lg">
                خصم {discountPercent}%
              </div>
            )}
            <Image
              src={activeImage}
              alt={productName}
              fill
              className="object-cover transition-transform duration-700"
              onError={imageFallback}
            />
          </div>
        )}

        {/* Info */}
        <div className="space-y-4">
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
