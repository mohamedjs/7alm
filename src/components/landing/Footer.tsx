export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="font-heading text-2xl font-bold text-gradient mb-2">
              حلم
            </h3>
            <p className="text-gray-500 text-sm">
              أفضل جودة بأفضل سعر — توصيل لجميع أنحاء مصر
            </p>
          </div>

          <div className="flex items-center gap-6 text-gray-500 text-sm">
            <span>© {new Date().getFullYear()} حلم. جميع الحقوق محفوظة</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
