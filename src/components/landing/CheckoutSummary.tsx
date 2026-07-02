"use client";

import Image from "next/image";
import {
  useProductGallery,
  useUrgencyBanner,
} from "@/features/checkout/checkout-summary.hooks";

export default function CheckoutSummary() {
  const { time, viewers } = useUrgencyBanner();
  const { galleryImages, activeImage, setActiveImage } = useProductGallery();

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
          أسرع! <strong className="text-gray-900">{viewers} شخص</strong> يشاهدون هذا المنتج الآن.
        </p>
      </div>

      {/* Product Card */}
      <div className="bg-white shadow-lg border border-gray-100 rounded-3xl p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -z-10" />
        
        {/* Main Image */}
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 border border-gray-100 group">
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full z-10 shadow-lg">
            خصم 45%
          </div>
          <Image
            src={activeImage}
            alt="جراب موبايل حلم"
            fill
            className="object-cover transition-transform duration-700"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              if (target.parentElement) {
                const fallback = document.createElement("div");
                fallback.className = "w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400";
                fallback.innerHTML = `<svg class="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span>صورة المنتج</span>`;
                target.parentElement.appendChild(fallback);
              }
            }}
            onAbort={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              if (target.parentElement) {
                const fallback = document.createElement("div");
                fallback.className = "w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400";
                fallback.innerHTML = `<svg class="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span>صورة المنتج</span>`;
                target.parentElement.appendChild(fallback);
              }
            }}
          />
        </div>

        {/* Thumbnails Gallery */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {galleryImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveImage(img)}
              className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                activeImage === img ? "border-brand-500 scale-105" : "border-gray-200 hover:border-brand-300 opacity-70 hover:opacity-100"
              }`}
            >
              <Image 
              src={img} 
              alt={`image ${idx + 1}`} 
              fill 
              className="object-cover" 
              onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              if (target.parentElement) {
                const fallback = document.createElement("div");
                fallback.className = "w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400";
                fallback.innerHTML = `<svg class="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span>صورة المنتج</span>`;
                target.parentElement.appendChild(fallback);
              }
            }}
            onAbort={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              if (target.parentElement) {
                const fallback = document.createElement("div");
                fallback.className = "w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400";
                fallback.innerHTML = `<svg class="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span>صورة المنتج</span>`;
                target.parentElement.appendChild(fallback);
              }
            }}
              />
            </button>
          ))}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-gray-900">
            جراب حلم الشفاف <span className="text-transparent bg-clip-text bg-gradient-to-l from-brand-500 to-brand-700">ضد الصدمات</span>
          </h1>
          
          <div className="flex items-end gap-3 pb-4 border-b border-gray-100">
            <span className="text-4xl font-bold text-gray-900">250 <span className="text-lg text-gray-500 font-normal">ج.م</span></span>
            <span className="text-lg text-gray-400 line-through mb-1">450 ج.م</span>
          </div>

          <div className="pt-2 space-y-3">
            {[
              "حماية 360 درجة مع زوايا مدعمة ضد السقوط",
              "تقنية نانو لمنع الاصفرار والبصمات",
              "تصميم رفيع وأنيق يحافظ على شكل الموبايل",
              "متوفر لآيفون وسامسونج (أغلب الموديلات)"
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-600 text-sm leading-relaxed">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: "🚚", text: "شحن سريع" },
          { icon: "🛡️", text: "ضمان جودة" },
          { icon: "💵", text: "الدفع عند الاستلام" },
        ].map((badge, i) => (
          <div key={i} className="bg-white rounded-xl p-3 flex flex-col items-center justify-center gap-1 text-center border border-gray-100 shadow-sm">
            <span className="text-2xl">{badge.icon}</span>
            <span className="text-xs text-gray-600 font-medium">{badge.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
