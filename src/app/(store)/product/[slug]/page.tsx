import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { productService } from "@/features/products/products.service";
import { categoryService } from "@/features/categories/categories.service";
import StoreNavbar from "@/components/store/StoreNavbar";
import ProductDetail from "@/components/store/ProductDetail";
import StoreFooter from "@/components/store/StoreFooter";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await productService.getProductBySlug(slug);
  if (!product) return { title: "منتج غير موجود" };
  return {
    title: `${product.name} | حلم`,
    description: product.description || `تسوق ${product.name} من حلم`,
  };
}

/**
 * Store product detail — `/product/[slug]`. Browsable catalog page with
 * full site chrome and "add to cart" (unlike `(landing)/[slug]`, which is
 * the direct-buy funnel for the same underlying product row).
 */
export default async function StoreProductPage({ params }: PageProps) {
  const { slug } = await params;

  const [product, categories] = await Promise.all([
    productService.getProductBySlug(slug),
    categoryService.getActiveCategories(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-surface transition-colors">
      <StoreNavbar categories={categories} />
      <div className="container mx-auto px-6 pt-32 pb-20 lg:pt-44">
        <ProductDetail product={product} />
      </div>
      <StoreFooter />
    </main>
  );
}
