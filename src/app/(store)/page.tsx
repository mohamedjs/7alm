import type { Metadata } from "next";
import { productService } from "@/features/products/products.service";
import { categoryService } from "@/features/categories/categories.service";
import { reviewsService } from "@/features/reviews/reviews.service";
import StoreNavbar from "@/components/store/master/StoreNavbar";
import LookbookHero from "@/components/store/home/LookbookHero";
import BestSellersSection from "@/components/store/home/BestSellersSection";
import ProductCollections from "@/components/store/home/ProductCollections";
import CustomerReviews from "@/components/store/home/CustomerReviews";
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
 * products, active categories, order-count-ranked best sellers, the full
 * active catalog, and the real-review showcase, then hands them to client
 * islands (StoreNavbar/LookbookHero/BestSellersSection/ProductCollections/
 * CustomerReviews own their own interactivity via hooks). Order: Navbar →
 * Hero → Best Sellers → Product Collections → Customer Reviews → Footer.
 */
export default async function StoreHomePage() {
  const [featuredProducts, categories, bestSellers, allProducts, showcase] = await Promise.all([
    productService.getFeaturedProducts(),
    categoryService.getActiveCategories(),
    productService.getBestSellerProducts(8),
    productService.getAllActiveProducts(),
    reviewsService.getShowcaseReviews({ minRating: 4, limit: 12 }),
  ]);

  return (
    <main className="min-h-screen">
      <StoreNavbar categories={categories} />
      <LookbookHero featuredProducts={featuredProducts} />
      <BestSellersSection products={bestSellers} />
      <ProductCollections products={allProducts} categories={categories} />
      <CustomerReviews reviews={showcase.reviews} aggregate={showcase.aggregate} />
      <StoreFooter />
    </main>
  );
}
