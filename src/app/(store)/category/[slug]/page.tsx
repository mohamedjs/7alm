import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categoryService } from "@/features/categories/categories.service";
import { productService } from "@/features/products/products.service";
import StoreNavbar from "@/components/store/StoreNavbar";
import StoreFooter from "@/components/store/StoreFooter";
import CategoryLabel from "@/components/store/CategoryLabel";
import CategoryProductsView from "@/components/store/CategoryProductsView";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await categoryService.getCategoryBySlug(slug);
  if (!category || !category.is_active) return { title: "قسم غير موجود | حلم" };
  return {
    title: `${category.name_ar} | حلم`,
    description: `تسوق ${category.name_ar} من حلم — توصيل لجميع أنحاء مصر`,
  };
}

/**
 * Category listing — `/category/[slug]`. Server Component: resolves the
 * category by slug, 404s on unknown/inactive categories, fetches its full
 * active product list via the existing read layer (including immediate
 * subcategory products, per `getActiveProductsByCategory`'s documented
 * behavior). `CategoryProductsView` (client, refinement B / 008 redo)
 * owns the sort/filter interaction and locale-aware heading from there —
 * the server page no longer renders a hardcoded-Arabic heading/count.
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
    <main className="min-h-screen">
      <StoreNavbar categories={categories} />
      <div className="container mx-auto px-6 pt-32 pb-20 lg:pt-44">
        <CategoryLabel
          category={category}
          as="h1"
          className="mb-10 font-heading text-3xl font-extrabold text-text-primary lg:text-4xl"
        />
        <CategoryProductsView products={products} />
      </div>
      <StoreFooter />
    </main>
  );
}
