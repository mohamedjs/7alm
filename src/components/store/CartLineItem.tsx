"use client";

import Image from "next/image";
import { Minus, Plus, X } from "lucide-react";
import type { CartItem } from "@/features/cart/cart.slice";
import { useLocale } from "@/features/i18n/i18n.hooks";

interface CartLineItemProps {
  item: CartItem;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

/** Single cart row — image, name, price, quantity stepper, remove. */
export default function CartLineItem({ item, onUpdateQuantity, onRemove }: CartLineItemProps) {
  const { t } = useLocale();

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface neu-raised-sm p-3">
      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-surface-raised shrink-0">
        {item.main_image ? (
          <Image src={item.main_image} alt={item.name} fill sizes="64px" className="object-cover" />
        ) : (
          <div className="w-full h-full" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary line-clamp-1">{item.name}</p>
        <p className="text-sm text-text-muted">{item.price} {t("store.product.currency")}</p>

        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
            aria-label={t("store.cart.decreaseQty")}
            className="flex items-center justify-center w-6 h-6 rounded-lg neu-pressed-sm text-text-muted hover:text-text-primary transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-5 text-center text-sm text-text-primary">{item.quantity}</span>
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
            aria-label={t("store.cart.increaseQty")}
            className="flex items-center justify-center w-6 h-6 rounded-lg neu-pressed-sm text-text-muted hover:text-text-primary transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(item.product_id)}
        aria-label={t("store.cart.remove")}
        className="text-text-muted hover:text-danger transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
