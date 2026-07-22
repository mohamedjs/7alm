import Link from "next/link";

/**
 * Store-specific footer — kept separate from `src/components/landing/Footer.tsx`
 * so the funnel's footer can evolve independently (per plan constraints).
 */
export default function StoreFooter() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-start">
            <h3 className="font-heading text-2xl font-bold text-brand-400 mb-2">
              حلم
            </h3>
            <p className="text-gray-500 text-sm">
              أفضل جودة بأفضل سعر — توصيل لجميع أنحاء مصر
            </p>
          </div>

          <div className="flex items-center gap-6 text-gray-500 text-sm">
            <span>© {new Date().getFullYear()} حلم. جميع الحقوق محفوظة</span>
            <Link
              href="/privacy"
              className="hover:text-gray-300 transition-colors underline underline-offset-4"
            >
              سياسة الخصوصية
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
