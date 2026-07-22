"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/features/shared/types";

/**
 * Owns the Lookbook hero's "currently displayed" featured product.
 * Defaults to the first featured product once the list loads; clicking a
 * `ProductThumbRow` thumbnail re-points `activeItem` via `setActiveId`.
 */
export function useLookbookActiveItem(featuredProducts: Product[]) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (featuredProducts.length === 0) return;
    if (!activeId || !featuredProducts.some((p) => p.id === activeId)) {
      setActiveId(featuredProducts[0].id);
    }
  }, [activeId, featuredProducts]);

  const activeItem = useMemo(
    () => featuredProducts.find((p) => p.id === activeId) ?? featuredProducts[0] ?? null,
    [featuredProducts, activeId]
  );

  return { activeItem, setActiveId };
}

/**
 * Tracks whether the page has been scrolled past `threshold` px — drives
 * `StoreNavbar`'s transparent → `.glass-dark` transition.
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
