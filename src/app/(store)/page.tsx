import type { Metadata } from "next";
import { productService } from "@/features/products/products.service";
import { categoryService } from "@/features/categories/categories.service";
import StoreNavbar from "@/components/store/StoreNavbar";
import LookbookHero from "@/components/store/LookbookHero";
import CategoryGrid from "@/components/store/CategoryGrid";
import StoreFooter from "@/components/store/StoreFooter";

// Server-rendered on demand rather than prerendered — avoids requiring
// Supabase access at build time (there is no dynamic param here, unlike
// `(landing)/[slug]`, so this page would otherwise be a build-time
// static/ISR candidate).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "حلم | المتجر",
  description: "تسوق أحدث المنتجات من حلم — توصيل لجميع أنحاء مصر",
};

/**
 * Dynamic Lookbook homepage — `/`. Server Component: fetches featured
 * products + active categories, then hands them to client islands
 * (StoreNavbar/LookbookHero own their own interactivity via hooks).
 */
export default async function StoreHomePage() {
  const [featuredProducts, categories] = await Promise.all([
    productService.getFeaturedProducts(),
    categoryService.getActiveCategories(),
  ]);

  return (
    <main className="min-h-screen bg-dark-900">
      <StoreNavbar categories={categories} />
      <LookbookHero featuredProducts={featuredProducts} />
      <CategoryGrid categories={categories} />
      <StoreFooter />
    </main>
  );
}
