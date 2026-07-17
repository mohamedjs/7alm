import Link from "next/link";
import Footer from "@/components/landing/Footer";

export const metadata = {
  title: "سياسة الخصوصية | حلم 7alm",
  description: "سياسة الخصوصية لمتجر حلم - تعرف على كيفية حماية واستخدام بياناتك الشخصية.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 py-12 lg:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header / Logo */}
          <div className="flex justify-center mb-8 lg:mb-12">
            <Link href="/" className="font-heading text-3xl font-bold text-gray-900 tracking-wider hover:opacity-80 transition-opacity">
              حلم <span className="text-brand-500">7alm</span>
            </Link>
          </div>

          {/* Policy Content Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 lg:p-12 text-gray-800 space-y-8 leading-relaxed">
            <div className="border-b border-gray-100 pb-6">
              <h1 className="font-heading text-3xl font-extrabold text-gray-900 mb-2">
                سياسة الخصوصية
              </h1>
              <p className="text-gray-500 text-sm">
                آخر تحديث: {new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            <p className="text-lg text-gray-600">
              مرحباً بك في متجر **حلم (7alm)**. نحن نقدر ثقتك بنا ونلتزم بحماية خصوصية بياناتك الشخصية. توضح هذه السياسة كيفية جمع بياناتك، واستخدامها، ومشاركتها عند استخدامك لموقعنا الإلكتروني أو التفاعل معنا عبر قنوات التواصل الاجتماعي المختلفة.
            </p>

            <section className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-gray-900">
                1. البيانات التي نجمعها
              </h2>
              <p className="text-gray-600">
                نقوم بجمع البيانات اللازمة فقط لتقديم خدماتنا وإتمام طلبات الشراء الخاصة بك بشكل صحيح وآمن:
              </p>
              <ul className="list-disc list-inside pr-4 space-y-2 text-gray-600">
                <li>
                  <strong>البيانات الشخصية:</strong> الاسم الكامل، رقم الهاتف (بما في ذلك رقم الواتساب)، وعنوان التوصيل التفصيلي (المحافظة، المدينة، الشارع).
                </li>
                <li>
                  <strong>بيانات الطلبات:</strong> المنتجات التي تطلبها، الكميات، وإجمالي القيمة المالية للطلب.
                </li>
                <li>
                  <strong>البيانات التقنية التلقائية:</strong> عنوان بروتوكول الإنترنت (IP address)، البلد، والمدينة التقريبية (لتحديد موقع الطلب وحمايتنا وحمايتك من عمليات الاحتيال).
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-gray-900">
                2. كيف نستخدم بياناتك الشخصية
              </h2>
              <p className="text-gray-600">
                نستخدم البيانات التي نجمعها للأغراض التالية:
              </p>
              <ul className="list-disc list-inside pr-4 space-y-2 text-gray-600">
                <li>معالجة وتأكيد طلبات الشراء الخاصة بك وتجهيزها للشحن.</li>
                <li>التواصل معك عبر **الواتساب (WhatsApp)** لإرسال إشعارات تأكيد الطلبات، أو عند خروج الشحنة وتوصيلها.</li>
                <li>الرد التلقائي والذكي على استفساراتك وتعليقاتك ورسائلك عبر صفحة الفيسبوك وحساب الإنستغرام الخاص بنا باستخدام مساعد الذكاء الاصطناعي الخاص بالمتجر.</li>
                <li>تحسين جودة خدماتنا وتجربة التسوق الخاصة بك.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-gray-900">
                3. مشاركة البيانات مع أطراف ثالثة
              </h2>
              <p className="text-gray-600">
                نحن لا نبيع أو نؤجر بياناتك الشخصية لأي جهة. نشارك بياناتك فقط مع أطراف ثالثة موثوقة ضرورية لإتمام عملية الشراء والتوصيل:
              </p>
              <ul className="list-disc list-inside pr-4 space-y-2 text-gray-600">
                <li>
                  <strong>شركات الشحن والتوصيل (مثل Bosta أو ABS أو Mylerz):</strong> نشارك معهم الاسم، رقم الهاتف، والعنوان التفصيلي ليتمكن مندوب الشحن من التواصل معك وتسليمك الطلب وتحصيل القيمة عند الاستلام.
                </li>
                <li>
                  <strong>مزودي الخدمات التكنولوجية:</strong> مثل خدمات الاستضافة وقنوات الاتصال الآمنة (Meta Cloud APIs لمراسلات الواتساب والفيسبوك وإنستغرام) لمعالجة الرسائل والإشعارات.
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-gray-900">
                4. حماية وأمن البيانات
              </h2>
              <p className="text-gray-600">
                نتخذ تدابير أمنية تقنية وتنظيمية صارمة لحماية بياناتك من الوصول غير المصرح به، أو التعديل، أو الإفصاح، أو الإتلاف. يتم تخزين بياناتك في قواعد بيانات آمنة ومشفرة، ويقتصر الوصول إليها على الموظفين المخولين فقط لإدارة الطلبات.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-gray-900">
                5. حقوقك
              </h2>
              <p className="text-gray-600">
                لديك الحق الكامل في الوصول إلى بياناتك الشخصية المسجلة لدينا، أو طلب تصحيحها في حال وجود خطأ، أو طلب حذفها تماماً من سجلاتنا. يمكنك القيام بذلك في أي وقت عن طريق التواصل معنا عبر الواتساب أو رسائل الصفحة.
              </p>
            </section>

            <section className="space-y-4 pb-4">
              <h2 className="font-heading text-2xl font-bold text-gray-900">
                6. التغييرات على سياسة الخصوصية
              </h2>
              <p className="text-gray-600">
                قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر لتعكس التغييرات في ممارساتنا أو لأسباب تشغيلية أو قانونية أخرى. سيتم نشر أي تغييرات على هذه الصفحة مع تحديث تاريخ "آخر تحديث".
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
