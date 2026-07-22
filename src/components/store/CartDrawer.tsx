"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useCart } from "@/features/cart/cart.hooks";
import { useLocale } from "@/features/i18n/i18n.hooks";
import CartLineItem from "./CartLineItem";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Slide-over cart summary triggered from `StoreNavbar`'s cart icon. */
export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const { t } = useLocale();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-y-0 end-0 w-full max-w-sm bg-surface-raised flex flex-col shadow-2xl border-s border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-heading text-lg font-bold text-text-primary">{t("store.cart.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("store.cart.closeLabel")}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {items.length === 0 ? (
            <p className="text-center text-text-muted py-16 text-sm">{t("store.cart.empty")}</p>
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
          <div className="px-5 py-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between text-text-primary font-medium">
              <span>{t("store.cart.subtotal")}</span>
              <span>{subtotal} {t("store.product.currency")}</span>
            </div>
            <Link
              href="/checkout"
              onClick={onClose}
              className="block w-full text-center rounded-xl bg-brand-500 py-3 font-bold text-white transition-all neu-btn"
            >
              {t("store.cart.checkout")}
            </Link>
            <Link
              href="/cart"
              onClick={onClose}
              className="block w-full text-center text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              {t("store.cart.viewFull")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
