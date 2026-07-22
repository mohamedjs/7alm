import type { Metadata } from "next";
import { productService } from "@/features/products/products.service";
import { categoryService } from "@/features/categories/categories.service";
import StoreNavbar from "@/components/store/StoreNavbar";
import ProductGrid from "@/components/store/ProductGrid";
import StoreFooter from "@/components/store/StoreFooter";
import ProductsPageIntro from "@/components/store/ProductsPageIntro";
import CategoryLabel from "@/components/store/CategoryLabel";
import type { Category, Product } from "@/features/shared/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "كل المنتجات | حلم",
  description: "تسوق كل المنتجات المتاحة من حلم — توصيل لجميع أنحاء مصر",
};

/**
 * All active products across all categories, grouped by category section.
 * Products with no `category_id` (or an inactive one) land in a trailing
 * uncategorized section rather than being silently dropped.
 *
 * Note: Page headings are server-rendered in Arabic (the default language).
 * When the user toggles to English, the client components (ProductGrid,
 * Navbar, Footer) switch, but these server-rendered headings stay Arabic.
 * This is acceptable per spec (chrome translation, not content localization).
 */
export default async function AllProductsPage() {
  const [products, categories] = await Promise.all([
    productService.getAllActiveProducts(),
    categoryService.getActiveCategories(),
  ]);

  const byCategory = new Map<string, Product[]>();
  const uncategorized: Product[] = [];

  for (const product of products) {
    if (product.category_id && categories.some((c) => c.id === product.category_id)) {
      const list = byCategory.get(product.category_id) ?? [];
      list.push(product);
      byCategory.set(product.category_id, list);
    } else {
      uncategorized.push(product);
    }
  }

  const sections: Array<{ category: Category | null; products: Product[] }> = [
    ...categories
      .map((category) => ({ category, products: byCategory.get(category.id) ?? [] }))
      .filter((section) => section.products.length > 0),
    ...(uncategorized.length > 0 ? [{ category: null, products: uncategorized }] : []),
  ];

  return (
    <main className="min-h-screen">
      <StoreNavbar categories={categories} />
      <div className="container mx-auto px-6 pt-32 pb-20 lg:pt-44">
        <ProductsPageIntro count={products.length} />

        {sections.length === 0 ? (
          <ProductGrid products={[]} />
        ) : (
          <div className="space-y-16">
            {sections.map((section) => (
              <section key={section.category?.id ?? "uncategorized"}>
                <CategoryLabel
                  category={section.category}
                  as="h2"
                  className="font-heading text-2xl font-bold text-text-primary mb-6"
                />
                <ProductGrid products={section.products} />
              </section>
            ))}
          </div>
        )}
      </div>
      <StoreFooter />
    </main>
  );
}
