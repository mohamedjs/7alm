"use client";

import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-brand-950" />

      {/* Animated orbs */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl float" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl float" style={{ animationDelay: "3s" }} />

      <div className="relative z-10 container mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-2 text-sm text-brand-300">
              <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" />
              عرض محدود — اطلب الآن
            </div>

            <h1 className="font-heading text-5xl lg:text-7xl font-black leading-tight">
              <span className="text-gradient">جرابات الموبايل</span>
              <br />
              <span className="text-white">حماية وأناقة لا مثيل لها</span>
            </h1>

            <p className="text-lg text-gray-400 max-w-lg leading-relaxed">
              اكتشف أحدث تشكيلة من جرابات الموبايل. حماية كاملة لجهازك ضد الصدمات والخدوش، مع تصميمات عصرية تناسب ذوقك. توصيل سريع لجميع أنحاء مصر.
            </p>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">350</span>
                <span className="text-xl text-gray-400">ج.م</span>
              </div>
              <div className="flex items-baseline gap-2 line-through opacity-50">
                <span className="text-2xl text-gray-500">500</span>
                <span className="text-gray-500">ج.م</span>
              </div>
              <span className="bg-brand-500/20 text-brand-300 text-sm font-bold px-3 py-1 rounded-full">
                خصم 30%
              </span>
            </div>

            <a
              href="#checkout"
              className="inline-flex items-center gap-3 bg-gradient-to-l from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all duration-300 hover:scale-105 pulse-glow"
            >
              اطلب الآن
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>

          {/* Product Image */}
          <div className="relative flex justify-center">
            <div className="relative w-80 h-80 lg:w-[450px] lg:h-[450px]">
              {/* Glow behind image */}
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-500/30 to-gold-500/20 rounded-3xl blur-2xl" />

              {/* Product image placeholder */}
              <div className="relative glass rounded-3xl w-full h-full flex items-center justify-center overflow-hidden">
                <Image
                  src="/images/product-main.jpg"
                  alt="جراب موبايل حلم"
                  fill
                  className="object-cover rounded-3xl"
                  priority
                  sizes="(max-width: 768px) 320px, 450px"
                  onError={(e) => {
                    // Fallback if image doesn't exist yet
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    target.parentElement!.innerHTML = `
                      <div class="flex flex-col items-center justify-center w-full h-full text-gray-500">
                        <svg class="w-20 h-20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p class="text-sm">صورة المنتج</p>
                      </div>
                    `;
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
