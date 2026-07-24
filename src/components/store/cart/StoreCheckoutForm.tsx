"use client";

import Link from "next/link";
import { useCartCheckoutForm } from "@/features/cart/cart.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";

/**
 * Multi-item checkout form — visually modeled on
 * `src/components/landing/CheckoutForm.tsx`, but submits the cart's items
 * as `CreateOrderInput.items[]` instead of a single `product_id`.
 * Uses `.neu-input` for all form fields (matching admin's ProductForm).
 */
export default function StoreCheckoutForm() {
  const {
    items,
    subtotal,
    shippingCost,
    total,
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
    coupon,
  } = useCartCheckoutForm();
  const { t, locale } = useLocale();

  if (success) {
    return (
      <div className="max-w-lg mx-auto rounded-3xl neu-raised-sm p-6 sm:p-10 text-center">
        <div className="w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-brand-600 dark:text-brand-400"
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
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-text-primary mb-4">
          {t("store.checkout.successTitle")}
        </h2>
        <p className="text-text-muted mb-2">
          {t("store.checkout.successPhone").replace("{phone}", fields.phone)}
        </p>
        <p className="text-text-muted text-sm">{t("store.checkout.successThanks")}</p>
      </div>
    );
  }

  const heading = (
    <h1 className="font-heading text-3xl lg:text-4xl font-extrabold text-text-primary mb-10">
      {t("store.checkout.title")}
    </h1>
  );

  if (items.length === 0) {
    return (
      <>
      {heading}
      <div className="max-w-lg mx-auto rounded-3xl neu-raised-sm p-10 text-center">
        <p className="text-text-muted mb-6">{t("store.checkout.emptyCart")}</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 font-bold text-white transition-all neu-btn"
        >
          {t("store.cart.browseProducts")}
        </Link>
      </div>
      </>
    );
  }

  return (
    <>
    {heading}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-2 rounded-3xl neu-raised-sm p-5 sm:p-8 lg:p-10 space-y-6"
      >
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-bold text-text-muted mb-2">
            {t("store.checkout.fullName")} <span className="text-danger">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fields.fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t("store.checkout.namePlaceholder")}
            className="w-full neu-input rounded-xl px-4 py-3 transition-all"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-bold text-text-muted mb-2">
            {t("store.checkout.phone")} <span className="text-danger">*</span>
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
          <label htmlFor="email" className="block text-sm font-bold text-text-muted mb-2">
            {t("store.checkout.email")} <span className="text-text-muted">{t("store.checkout.emailOptional")}</span>
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
          <label htmlFor="zone" className="block text-sm font-bold text-text-muted mb-2">
            {t("store.checkout.zone")} <span className="text-danger">*</span>
          </label>
          <select
            id="zone"
            required
            value={fields.zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="w-full neu-input rounded-xl px-4 py-3 transition-all"
          >
            <option value="">{t("store.checkout.zoneSelect")}</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {locale === "en" ? zone.english_name : zone.arabic_name} — {zone.city_name}
              </option>
            ))}
          </select>
        </div>

        {/* Street Details */}
        <div>
          <label htmlFor="streetDetails" className="block text-sm font-bold text-text-muted mb-2">
            {t("store.checkout.streetDetails")} <span className="text-danger">*</span>
          </label>
          <textarea
            id="streetDetails"
            required
            value={fields.streetDetails}
            onChange={(e) => setStreetDetails(e.target.value)}
            placeholder={t("store.checkout.streetPlaceholder")}
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
          className="w-full bg-brand-500 text-white font-bold text-lg py-4 rounded-2xl transition-all neu-btn disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t("store.checkout.submitLoading") : t("store.checkout.submitLabel")}
        </button>
      </form>

      {/* Order summary */}
      <div className="rounded-2xl bg-surface neu-raised-sm p-6 h-fit">
        <h2 className="font-heading text-lg font-bold text-text-primary mb-4">{t("store.cart.summary")}</h2>
        <div className="divide-y divide-border mb-4">
          {items.map((item) => (
            <div key={item.product_id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-text-muted line-clamp-1">
                {item.name} × {item.quantity}
              </span>
              <span className="text-text-primary font-medium">
                {item.price * item.quantity} {t("store.product.currency")}
              </span>
            </div>
          ))}
        </div>

        {/* Coupon code */}
        <div className="mb-4">
          <label htmlFor="couponCode" className="block text-xs font-bold text-text-muted mb-2">
            {t("store.checkout.coupon.label")}
          </label>
          <div className="flex gap-2">
            <input
              id="couponCode"
              type="text"
              dir="ltr"
              value={coupon.code}
              onChange={(e) => coupon.setCode(e.target.value)}
              placeholder={t("store.checkout.coupon.placeholder")}
              disabled={!!coupon.appliedCode}
              className="flex-1 neu-input rounded-xl px-3 py-2 text-sm transition-all disabled:opacity-60"
            />
            {coupon.appliedCode ? (
              <button
                type="button"
                onClick={coupon.remove}
                className="rounded-xl bg-surface px-3 py-2 text-xs font-bold text-danger transition-all neu-raised-sm"
              >
                {t("store.checkout.coupon.remove")}
              </button>
            ) : (
              <button
                type="button"
                onClick={coupon.apply}
                disabled={coupon.isLoading || !coupon.code.trim()}
                className="rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white transition-all disabled:opacity-50 neu-btn"
              >
                {coupon.isLoading ? t("store.checkout.coupon.applying") : t("store.checkout.coupon.apply")}
              </button>
            )}
          </div>
          {coupon.appliedCode && (
            <p className="mt-2 text-xs font-medium text-success">{t("store.checkout.coupon.applied")}</p>
          )}
          {coupon.error && <p className="mt-2 text-xs font-medium text-danger">{coupon.error}</p>}
        </div>

        <div className="flex items-center justify-between text-text-muted text-sm py-2">
          <span>{t("store.cart.subtotal")}</span>
          <span>{subtotal} {t("store.product.currency")}</span>
        </div>
        {coupon.discountAmount > 0 && (
          <div className="flex items-center justify-between text-success text-sm py-2">
            <span>
              {t("store.checkout.coupon.discountLine")}
              {coupon.appliedCode ? ` (${coupon.appliedCode})` : ""}
            </span>
            <span>-{coupon.discountAmount} {t("store.product.currency")}</span>
          </div>
        )}
        {fields.zoneId && (
          <div className="flex items-center justify-between text-text-muted text-sm py-2">
            <span>{t("store.checkout.shipping")}</span>
            <span>
              {coupon.finalShippingCost < shippingCost && (
                <span className="me-2 text-text-muted line-through">
                  {shippingCost} {t("store.product.currency")}
                </span>
              )}
              {coupon.finalShippingCost} {t("store.product.currency")}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between text-text-primary font-bold border-t border-border pt-4">
          <span>{t("store.cart.total")}</span>
          <span>{total} {t("store.product.currency")}</span>
        </div>
      </div>
    </div>
    </>
  );
}
