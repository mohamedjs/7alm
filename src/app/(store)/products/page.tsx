import type { Metadata } from "next";
import { productService } from "@/features/products/products.service";
import { categoryService } from "@/features/categories/categories.service";
import StoreNavbar from "@/components/store/StoreNavbar";
import ProductGrid from "@/components/store/ProductGrid";
import StoreFooter from "@/components/store/StoreFooter";
import type { Category, Product } from "@/features/shared/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "كل المنتجات | حلم",
  description: "تسوق كل المنتجات المتاحة من حلم — توصيل لجميع أنحاء مصر",
};

/**
 * All active products across all categories, grouped by category section
 * (each section reuses `ProductGrid`). Products with no `category_id` (or
 * an inactive one) land in a trailing "أخرى" section rather than being
 * silently dropped.
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
    <main className="min-h-screen bg-dark-900">
      <StoreNavbar categories={categories} />
      <div className="container mx-auto px-6 pt-32 pb-20 lg:pt-44">
        <div className="mb-12">
          <h1 className="font-heading text-3xl lg:text-4xl font-extrabold text-white mb-2">
            كل المنتجات
          </h1>
          <p className="text-gray-400">
            {products.length > 0 ? `${products.length} منتج متاح` : "لا توجد منتجات متاحة حالياً"}
          </p>
        </div>

        {sections.length === 0 ? (
          <ProductGrid products={[]} emptyMessage="لا توجد منتجات متاحة حالياً." />
        ) : (
          <div className="space-y-16">
            {sections.map((section) => (
              <section key={section.category?.id ?? "uncategorized"}>
                <h2 className="font-heading text-2xl font-bold text-white mb-6">
                  {section.category?.name_ar ?? "أخرى"}
                </h2>
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
