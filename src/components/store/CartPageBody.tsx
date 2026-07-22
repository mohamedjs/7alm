"use client";

import Link from "next/link";
import { useCart } from "@/features/cart/cart.hooks";
import CartLineItem from "./CartLineItem";

/** Full cart review page body — the `/cart` counterpart to `CartDrawer`'s quick view. */
export default function CartPageBody() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 py-20 text-center">
        <p className="text-gray-400 mb-6">السلة فارغة.</p>
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
      <div className="lg:col-span-2 divide-y divide-white/5 rounded-2xl neu-raised-sm px-5">
        {items.map((item) => (
          <CartLineItem
            key={item.product_id}
            item={item}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
          />
        ))}
      </div>

      <div className="rounded-2xl neu-raised-sm p-6 h-fit">
        <h2 className="font-heading text-lg font-bold text-white mb-4">ملخص الطلب</h2>
        <div className="flex items-center justify-between text-gray-300 mb-6">
          <span>الإجمالي</span>
          <span className="text-white font-bold">{subtotal} ج.م</span>
        </div>
        <Link
          href="/checkout"
          className="block w-full text-center rounded-xl bg-brand-500 hover:bg-brand-400 py-3 font-bold text-dark-950 transition-colors"
        >
          إتمام الطلب
        </Link>
      </div>
    </div>
  );
}
