"use client";

import Link from "next/link";
import { useCart } from "@/features/cart/cart.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";
import CartLineItem from "./CartLineItem";

/** Full cart review page body — the `/cart` counterpart to `CartDrawer`'s quick view. */
export default function CartPageBody() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const { t } = useLocale();

  const heading = (
    <h1 className="font-heading text-3xl lg:text-4xl font-extrabold text-text-primary mb-10">
      {t("store.cart.title")}
    </h1>
  );

  if (items.length === 0) {
    return (
      <>
        {heading}
      <div className="rounded-2xl border border-border py-20 text-center">
        <p className="text-text-muted mb-6">{t("store.cart.empty")}</p>
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
      <div className="lg:col-span-2 flex flex-col gap-3">
        {items.map((item) => (
          <CartLineItem
            key={item.product_id}
            item={item}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
          />
        ))}
      </div>

      <div className="rounded-2xl bg-surface neu-raised-sm p-6 h-fit">
        <h2 className="font-heading text-lg font-bold text-text-primary mb-4">{t("store.cart.summary")}</h2>
        <div className="flex items-center justify-between text-text-muted mb-6">
          <span>{t("store.cart.subtotal")}</span>
          <span className="text-text-primary font-bold">{subtotal} {t("store.product.currency")}</span>
        </div>
        <Link
          href="/checkout"
          className="block w-full text-center rounded-xl bg-brand-500 py-3 font-bold text-white transition-all neu-btn"
        >
          {t("store.cart.checkout")}
        </Link>
      </div>
      </div>
    </>
  );
}
