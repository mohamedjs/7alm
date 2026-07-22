"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/features/shared/types";

export interface LookbookSection {
  product: Product;
  index: number;
}

const MAX_HERO_SECTIONS = 4;

/** Orders featured products by the admin-settable `featured_sort` (ascending,
 *  nulls last), falling back to `created_at ASC` as a tiebreaker for products
 *  that haven't been given an explicit value yet. Caps at MAX_HERO_SECTIONS. */
export function useLookbookSections(featuredProducts: Product[]): LookbookSection[] {
  return useMemo(
    () =>
      [...featuredProducts]
        .sort((a, b) => {
          if (a.featured_sort == null && b.featured_sort == null) {
            return a.created_at.localeCompare(b.created_at);
          }
          if (a.featured_sort == null) return 1;
          if (b.featured_sort == null) return -1;
          return a.featured_sort - b.featured_sort;
        })
        .slice(0, MAX_HERO_SECTIONS)
        .map((product, index) => ({ product, index })),
    [featuredProducts],
  );
}

/**
 * Tracks whether the page has been scrolled past `threshold` px — drives
 * `StoreNavbar`'s idle → scrolled shadow transition (see `.store-glass`).
 */
export function useScrollGlass(threshold = 24): boolean {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return isScrolled;
}

export type ProductSortOption = "newest" | "price-asc" | "price-desc";

interface UseProductFiltersResult {
  sort: ProductSortOption;
  setSort: (sort: ProductSortOption) => void;
  inStockOnly: boolean;
  setInStockOnly: (value: boolean) => void;
  filteredProducts: Product[];
}

/**
 * Client-side sort/filter for a category's product list (refinement B,
 * 008 redo — the category page's server component fetches the full,
 * unfiltered list; this hook re-derives the displayed order/subset
 * in-browser so sorting/filtering feels instant with no round-trip).
 * Sort is stable via `Array.prototype.sort` on a shallow copy — the
 * incoming `products` array itself is never mutated.
 */
export function useProductFilters(products: Product[]): UseProductFiltersResult {
  const [sort, setSort] = useState<ProductSortOption>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);

  const filteredProducts = useMemo(() => {
    const base = inStockOnly
      ? products.filter((p) => p.stock_status !== "out_of_stock")
      : products;

    const sorted = [...base];
    switch (sort) {
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "newest":
      default:
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
        break;
    }
    return sorted;
  }, [products, sort, inStockOnly]);

  return { sort, setSort, inStockOnly, setInStockOnly, filteredProducts };
}
