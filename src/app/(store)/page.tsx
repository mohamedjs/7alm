import type { Metadata } from "next";
import { productService } from "@/features/products/products.service";
import { categoryService } from "@/features/categories/categories.service";
import StoreNavbar from "@/components/store/master/StoreNavbar";
import LookbookHero from "@/components/store/home/LookbookHero";
import BestSellersSection from "@/components/store/home/BestSellersSection";
import CategoryGrid from "@/components/store/home/CategoryGrid";
import ProductCollections from "@/components/store/home/ProductCollections";
import Testimonials from "@/components/store/home/Testimonials";
import StoreFooter from "@/components/store/master/StoreFooter";

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
 * products, active categories, order-count-ranked best sellers, and the
 * full active catalog, then hands them to client islands
 * (StoreNavbar/LookbookHero/BestSellersSection/ProductCollections/
 * Testimonials own their own interactivity via hooks). Order: Navbar →
 * Hero → Best Sellers → Product Collections → Testimonials → Footer.
 */
import { testimonialsService } from "@/features/testimonials/testimonials.service";

export default async function StoreHomePage() {
  const [featuredProducts, categories, bestSellers, allProducts, testimonials] = await Promise.all([
    productService.getFeaturedProducts(),
    categoryService.getActiveCategories(),
    productService.getBestSellerProducts(8),
    productService.getAllActiveProducts(),
    testimonialsService.getActiveTestimonials(),
  ]);

  return (
    <main className="min-h-screen">
      <StoreNavbar categories={categories} />
      <LookbookHero featuredProducts={featuredProducts} />
      <BestSellersSection products={bestSellers} />
      <ProductCollections products={allProducts} categories={categories} />
      <Testimonials testimonials={testimonials} />
      <StoreFooter />
    </main>
  );
}
