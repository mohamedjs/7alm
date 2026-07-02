const features = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: "توصيل لباب البيت",
    description: "نوصلك لأي مكان في مصر. الشحن سريع وآمن.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "حماية فائقة",
    description: "خامات مضادة للصدمات والخدوش تحمي تليفونك في أصعب الظروف.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    title: "تصميم أنيق",
    description: "جرابات رفيعة وخفيفة، متوفرة بألوان وأشكال تناسب ذوقك وتمنع الاصفرار.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: "توصيل لباب البيت",
    description: "نوصلك لأي مكان في مصر. الشحن سريع والدفع عند الاستلام.",
  },
];

export default function Features() {
  return (
    <section className="relative py-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl lg:text-4xl font-bold text-white mb-4">
            ليه تختار <span className="text-gradient">حلم</span>؟
          </h2>
          <p className="text-gray-400 max-w-md mx-auto">
            نقدملك أفضل تجربة شراء مع خدمات مميزة تضمنلك الراحة
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass rounded-2xl p-8 text-center group hover:bg-white/10 transition-all duration-500 hover:-translate-y-2"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500/10 text-brand-400 rounded-2xl mb-6 group-hover:bg-brand-500/20 group-hover:scale-110 transition-all duration-500">
                {feature.icon}
              </div>
              <h3 className="font-heading text-xl font-bold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
