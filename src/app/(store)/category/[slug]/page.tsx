import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categoryService } from "@/features/categories/categories.service";
import { productService } from "@/features/products/products.service";
import StoreNavbar from "@/components/store/StoreNavbar";
import ProductGrid from "@/components/store/ProductGrid";
import StoreFooter from "@/components/store/StoreFooter";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await categoryService.getCategoryBySlug(slug);
  if (!category || !category.is_active) return { title: "قسم غير موجود" };
  return {
    title: `${category.name_ar} | حلم`,
    description: `تسوق ${category.name_ar} من حلم — توصيل لجميع أنحاء مصر`,
  };
}

/**
 * Category listing — `/category/[slug]`. Server Component: resolves the
 * category by slug, 404s on unknown/inactive categories, lists its active
 * products via the Phase-1 read layer.
 */
export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;

  const [category, categories] = await Promise.all([
    categoryService.getCategoryBySlug(slug),
    categoryService.getActiveCategories(),
  ]);

  if (!category || !category.is_active) {
    notFound();
  }

  const products = await productService.getActiveProductsByCategory(category.id);

  return (
    <main className="min-h-screen bg-dark-900">
      <StoreNavbar categories={categories} />
      <div className="container mx-auto px-6 pt-32 pb-20 lg:pt-44">
        <div className="mb-10">
          <h1 className="font-heading text-3xl lg:text-4xl font-extrabold text-white mb-2">
            {category.name_ar}
          </h1>
          <p className="text-gray-400">
            {products.length > 0
              ? `${products.length} منتج متاح`
              : "لا توجد منتجات في هذا القسم حالياً"}
          </p>
        </div>

        <ProductGrid
          products={products}
          emptyMessage="لا توجد منتجات في هذا القسم حالياً."
        />
      </div>
      <StoreFooter />
    </main>
  );
}
