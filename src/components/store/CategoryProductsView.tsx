"use client";

import type { Product } from "@/features/shared/types";
import { useProductFilters } from "@/features/store/store.hooks";
import CategoryFilterBar from "./CategoryFilterBar";
import ProductGrid from "./ProductGrid";

interface CategoryProductsViewProps {
  products: Product[];
}

/**
 * Client island for `/category/[slug]`: the server page fetches the full,
 * unfiltered product list; this component owns the sort/filter UI state
 * (`useProductFilters`) and re-derives the displayed order/subset
 * in-browser, then hands the result to the existing `ProductGrid` (which
 * already owns cart wiring) — no new grid/card implementation needed.
 */
export default function CategoryProductsView({ products }: CategoryProductsViewProps) {
  const { sort, setSort, inStockOnly, setInStockOnly, filteredProducts } =
    useProductFilters(products);

  return (
    <>
      <CategoryFilterBar
        sort={sort}
        onSortChange={setSort}
        inStockOnly={inStockOnly}
        onInStockOnlyChange={setInStockOnly}
        resultCount={filteredProducts.length}
      />
      <ProductGrid products={filteredProducts} />
    </>
  );
}
