"use client";

import { useCheckoutForm } from "@/features/checkout/checkout.hooks";

interface CheckoutFormProps {
  productId?: string;
}

export default function CheckoutForm({ productId }: CheckoutFormProps) {
  const {
    zones,
    fields,
    setFullName,
    setPhone,
    setEmail,
    setZoneId,
    setStreetDetails,
    success,
    error,
    loading,
    handleSubmit,
  } = useCheckoutForm({ productId });

  if (success) {
    return (
      <section id="checkout" className="py-12 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-lg mx-auto bg-white shadow-lg border border-gray-100 rounded-3xl p-6 sm:p-10 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="font-heading text-3xl font-bold text-gray-900 mb-4">
              تم استلام طلبك بنجاح! 🎉
            </h2>
            <p className="text-gray-600 mb-2">
              هنتواصل معاك على رقم {fields.phone} لتأكيد الطلب
            </p>
            <p className="text-gray-500 text-sm">
              شكراً لاختيارك حلم
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div id="checkout">
      <div className="w-full">
          <div className="text-center mb-8">
            <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">
              أكمل <span className="text-transparent bg-clip-text bg-gradient-to-l from-brand-500 to-brand-700">الطلب</span>
            </h2>
            <p className="text-gray-500 text-sm">
              املأ البيانات وسيتم التواصل معك للتأكيد
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white shadow-lg border border-gray-100 rounded-3xl p-5 sm:p-8 lg:p-10 space-y-6"
          >
            {/* Full Name */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-bold text-gray-700 mb-2"
              >
                الاسم الكامل <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fields.fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="محمد أحمد"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm"
              />
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-bold text-gray-700 mb-2"
              >
                رقم الموبايل <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={fields.phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm text-right"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-bold text-gray-700 mb-2"
              >
                البريد الإلكتروني{" "}
                <span className="text-gray-400">(اختياري)</span>
              </label>
              <input
                id="email"
                type="email"
                value={fields.email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                dir="ltr"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm text-right"
              />
            </div>

            {/* Zone Dropdown */}
            <div>
              <label
                htmlFor="zone"
                className="block text-sm font-bold text-gray-700 mb-2"
              >
                المنطقة <span className="text-red-500">*</span>
              </label>
              <select
                id="zone"
                required
                value={fields.zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm appearance-none cursor-pointer"
              >
                <option value="" className="bg-white">
                  اختر المنطقة
                </option>
                {zones.map((zone) => (
                  <option
                    key={zone.id}
                    value={zone.id}
                    className="bg-white"
                  >
                    {zone.arabic_name} — {zone.city_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Street Details */}
            <div>
              <label
                htmlFor="streetDetails"
                className="block text-sm font-bold text-gray-700 mb-2"
              >
                العنوان بالتفصيل <span className="text-red-500">*</span>
              </label>
              <textarea
                id="streetDetails"
                required
                value={fields.streetDetails}
                onChange={(e) => setStreetDetails(e.target.value)}
                placeholder="رقم المبنى، اسم الشارع، علامة مميزة..."
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-sm resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-l from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white font-bold text-lg py-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg
                    className="animate-spin w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  جاري إرسال الطلب...
                </span>
              ) : (
                "تأكيد الطلب — الدفع عند الاستلام"
              )}
            </button>

            <p className="text-center text-gray-600 text-xs">
              بالضغط على تأكيد الطلب، أنت توافق على سياسة الخصوصية
            </p>
          </form>
        </div>
      </div>
  );
}
