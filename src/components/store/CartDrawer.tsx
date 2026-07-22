"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useCart } from "@/features/cart/cart.hooks";
import CartLineItem from "./CartLineItem";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Slide-over cart summary triggered from `StoreNavbar`'s cart icon. */
export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, subtotal, updateQuantity, removeItem } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-dark-950/70"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-y-0 end-0 w-full max-w-sm glass-dark flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="font-heading text-lg font-bold text-white">السلة</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق السلة"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 divide-y divide-white/5">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 py-16 text-sm">السلة فارغة.</p>
          ) : (
            items.map((item) => (
              <CartLineItem
                key={item.product_id}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
              />
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between text-white font-medium">
              <span>الإجمالي</span>
              <span>{subtotal} ج.م</span>
            </div>
            <Link
              href="/checkout"
              onClick={onClose}
              className="block w-full text-center rounded-xl bg-brand-500 hover:bg-brand-400 py-3 font-bold text-dark-950 transition-colors"
            >
              إتمام الطلب
            </Link>
            <Link
              href="/cart"
              onClick={onClose}
              className="block w-full text-center text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              عرض السلة كاملة
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
