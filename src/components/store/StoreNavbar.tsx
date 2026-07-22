"use client";

import { useState } from "react";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import type { Category } from "@/features/shared/types";
import { useScrollGlass } from "@/features/store/store.hooks";
import { useCart } from "@/features/cart/cart.hooks";
import CartDrawer from "./CartDrawer";

interface StoreNavbarProps {
  categories: Category[];
}

/**
 * Transparent-at-top → `.glass-dark` (reused, not new) once scrolled past
 * the threshold. Logo stays fixed brand cyan — the storefront's persistent
 * identity layer, never overridden by a product's `theme_color`.
 */
export default function StoreNavbar({ categories }: StoreNavbarProps) {
  const isScrolled = useScrollGlass();
  const { itemCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <>
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        isScrolled ? "glass-dark" : "bg-transparent"
      }`}
    >
      <nav className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="font-heading text-2xl font-bold text-brand-400 shrink-0">
          حلم <span className="text-white">7alm</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          <Link href="/" className="hover:text-brand-400 transition-colors">
            الرئيسية
          </Link>
          <Link href="/products" className="hover:text-brand-400 transition-colors">
            كل المنتجات
          </Link>
          {categories.filter((c) => !c.parent_id).slice(0, 4).map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="hover:text-brand-400 transition-colors"
            >
              {category.name_ar}
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          aria-label="سلة المشتريات"
          className="relative flex items-center justify-center w-10 h-10 rounded-full text-gray-200 hover:text-brand-400 transition-colors"
        >
          <ShoppingBag className="w-5 h-5" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -end-1 flex items-center justify-center w-4 h-4 rounded-full bg-brand-500 text-[10px] font-bold text-dark-950">
              {itemCount > 9 ? "9+" : itemCount}
            </span>
          )}
        </button>
      </nav>
    </header>

    <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
