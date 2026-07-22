"use client";

import Link from "next/link";
import { useCartCheckoutForm } from "@/features/cart/cart.hooks";

/**
 * Multi-item checkout form — visually modeled on
 * `src/components/landing/CheckoutForm.tsx`, but submits the cart's items
 * as `CreateOrderInput.items[]` instead of a single `product_id`.
 */
export default function StoreCheckoutForm() {
  const {
    items,
    subtotal,
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
  } = useCartCheckoutForm();

  if (success) {
    return (
      <div className="max-w-lg mx-auto rounded-3xl neu-raised-sm p-6 sm:p-10 text-center">
        <div className="w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-brand-400"
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
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-4">
          تم استلام طلبك بنجاح!
        </h2>
        <p className="text-gray-400 mb-2">
          هنتواصل معاك على رقم {fields.phone} لتأكيد الطلب
        </p>
        <p className="text-gray-500 text-sm">شكراً لاختيارك حلم</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto rounded-3xl neu-raised-sm p-10 text-center">
        <p className="text-gray-400 mb-6">السلة فارغة — أضف منتجات أولاً.</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 hover:bg-brand-400 px-6 py-3 font-bold text-dark-950 transition-colors"
        >
          تصفح المنتجات
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-2 rounded-3xl neu-raised-sm p-5 sm:p-8 lg:p-10 space-y-6"
      >
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-bold text-gray-300 mb-2">
            الاسم الكامل <span className="text-danger">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fields.fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="محمد أحمد"
            className="w-full neu-input rounded-xl px-4 py-3 transition-all"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-bold text-gray-300 mb-2">
            رقم الموبايل <span className="text-danger">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            required
            value={fields.phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01xxxxxxxxx"
            dir="ltr"
            className="w-full neu-input rounded-xl px-4 py-3 transition-all"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-bold text-gray-300 mb-2">
            البريد الإلكتروني <span className="text-gray-500">(اختياري)</span>
          </label>
          <input
            id="email"
            type="email"
            value={fields.email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            dir="ltr"
            className="w-full neu-input rounded-xl px-4 py-3 transition-all"
          />
        </div>

        {/* Zone */}
        <div>
          <label htmlFor="zone" className="block text-sm font-bold text-gray-300 mb-2">
            المنطقة <span className="text-danger">*</span>
          </label>
          <select
            id="zone"
            required
            value={fields.zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="w-full neu-input rounded-xl px-4 py-3 transition-all"
          >
            <option value="">اختر المنطقة</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.arabic_name} — {zone.city_name}
              </option>
            ))}
          </select>
        </div>

        {/* Street Details */}
        <div>
          <label htmlFor="streetDetails" className="block text-sm font-bold text-gray-300 mb-2">
            العنوان بالتفصيل <span className="text-danger">*</span>
          </label>
          <textarea
            id="streetDetails"
            required
            value={fields.streetDetails}
            onChange={(e) => setStreetDetails(e.target.value)}
            placeholder="رقم المبنى، اسم الشارع، علامة مميزة..."
            rows={3}
            className="w-full neu-input rounded-xl px-4 py-3 transition-all resize-none"
          />
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 text-danger text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-500 hover:bg-brand-400 text-dark-950 font-bold text-lg py-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "جاري إرسال الطلب..." : "تأكيد الطلب — الدفع عند الاستلام"}
        </button>
      </form>

      {/* Order summary */}
      <div className="rounded-2xl neu-raised-sm p-6 h-fit">
        <h2 className="font-heading text-lg font-bold text-white mb-4">ملخص الطلب</h2>
        <div className="divide-y divide-white/5 mb-4">
          {items.map((item) => (
            <div key={item.product_id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-gray-300 line-clamp-1">
                {item.name} × {item.quantity}
              </span>
              <span className="text-gray-200 font-medium">
                {item.price * item.quantity} ج.م
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-white font-bold border-t border-white/5 pt-4">
          <span>الإجمالي</span>
          <span>{subtotal} ج.م</span>
        </div>
      </div>
    </div>
  );
}
