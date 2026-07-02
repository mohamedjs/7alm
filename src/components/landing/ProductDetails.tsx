import React from "react";

export default function ProductDetails() {
  return (
    <section className="py-24 relative overflow-hidden bg-dark-900 border-y border-white/5">
      <div className="absolute inset-0 bg-gradient-to-r from-brand-900/10 to-transparent" />
      
      <div className="container mx-auto px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Product Details */}
            <div className="space-y-6">
              <div className="inline-block px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-bold tracking-wider">
                الأكثر مبيعاً
              </div>
              <h2 className="font-heading text-4xl lg:text-5xl font-bold text-white leading-tight">
                جراب حلم <span className="text-gradient">ضد الصدمات</span>
              </h2>
              <div className="flex items-end gap-4">
                <span className="text-5xl font-bold text-white">250 ج.م</span>
                <span className="text-xl text-gray-500 line-through mb-1">450 ج.م</span>
              </div>
              
              <ul className="space-y-4 pt-4">
                {[
                  "حماية كاملة 360 درجة مع زوايا مدعمة ضد السقوط",
                  "تصميم رفيع جداً مش بيكبر حجم الموبايل",
                  "مضاد للاصفرار والبصمات بفضل تقنية نانو للطلاء",
                  "يدعم الشحن اللاسلكي بشكل كامل",
                  "متوفر لجميع أجهزة iPhone و Samsung الحديثة"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300">
                    <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="pt-6">
                <a
                  href="#checkout"
                  className="inline-flex items-center justify-center w-full md:w-auto px-8 py-4 rounded-2xl bg-gradient-to-l from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white font-bold text-lg transition-all duration-300 hover:scale-[1.02] shadow-[0_0_30px_rgba(var(--brand-500),0.3)]"
                >
                  اطلب الآن واستفيد بالخصم
                </a>
              </div>
            </div>

            {/* Product Highlight / Stat Cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: "حماية", desc: "مقاوم للصدمات والسقوط", icon: "🛡️" },
                { title: "توصيل سريع", desc: "لجميع محافظات مصر", icon: "🚀" },
                { title: "دفع آمن", desc: "الدفع عند الاستلام", icon: "💰" },
                { title: "جودة", desc: "خامات أصلية 100%", icon: "⭐" },
              ].map((card, i) => (
                <div key={i} className="glass p-6 rounded-3xl text-center space-y-2 hover:bg-white/5 transition-colors border border-white/5 hover:border-white/10">
                  <div className="text-4xl mb-4">{card.icon}</div>
                  <h3 className="font-bold text-white text-lg">{card.title}</h3>
                  <p className="text-sm text-gray-400">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
