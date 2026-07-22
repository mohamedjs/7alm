import type { Metadata } from "next";
import { productService } from "@/features/products/products.service";
import { categoryService } from "@/features/categories/categories.service";
import StoreNavbar from "@/components/store/StoreNavbar";
import LookbookHero from "@/components/store/LookbookHero";
import BestSellersSection from "@/components/store/BestSellersSection";
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
 * products, active categories, and order-count-ranked best sellers, then
 * hands them to client islands (StoreNavbar/LookbookHero/BestSellersSection
 * own their own interactivity via hooks). Order: Navbar → Hero → Best
 * Sellers → Categories → Footer.
 */
export default async function StoreHomePage() {
  const [featuredProducts, categories, bestSellers] = await Promise.all([
    productService.getFeaturedProducts(),
    categoryService.getActiveCategories(),
    productService.getBestSellerProducts(8),
  ]);

  return (
    <main className="min-h-screen">
      <StoreNavbar categories={categories} />
      <LookbookHero featuredProducts={featuredProducts} />
      <BestSellersSection products={bestSellers} />
      {/* <CategoryGrid categories={categories} /> */}
      <StoreFooter />
    </main>
  );
}
