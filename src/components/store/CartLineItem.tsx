"use client";

import Image from "next/image";
import { Minus, Plus, X } from "lucide-react";
import type { CartItem } from "@/features/cart/cart.slice";

interface CartLineItemProps {
  item: CartItem;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

/** Single cart row — image, name, price, quantity stepper, remove. */
export default function CartLineItem({ item, onUpdateQuantity, onRemove }: CartLineItemProps) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-dark-800 shrink-0">
        {item.main_image ? (
          <Image src={item.main_image} alt={item.name} fill sizes="64px" className="object-cover" />
        ) : (
          <div className="w-full h-full" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-100 line-clamp-1">{item.name}</p>
        <p className="text-sm text-gray-400">{item.price} ج.م</p>

        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
            aria-label="تقليل الكمية"
            className="flex items-center justify-center w-6 h-6 rounded-lg neu-pressed-sm text-gray-300 hover:text-white transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-5 text-center text-sm text-white">{item.quantity}</span>
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
            aria-label="زيادة الكمية"
            className="flex items-center justify-center w-6 h-6 rounded-lg neu-pressed-sm text-gray-300 hover:text-white transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(item.product_id)}
        aria-label="إزالة من السلة"
        className="text-gray-500 hover:text-danger transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
