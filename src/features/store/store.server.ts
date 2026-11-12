import "server-only";
import { serverGet } from "@/lib/api/server-fetch";
import type { Category, Product, ProductReviewPublic, ReviewAggregate, ShowcaseReview } from "@/features/shared/types";

/**
 * Server-side catalog reads for Server Components (storefront + landing).
 * Thin wrappers over the NestJS public API; caching is handled there (Redis)
 * and by Next's fetch cache here.
 */
export const catalogServer = {
  getProductBySlug: (slug: string) => serverGet<Product>(`/products/${encodeURIComponent(slug)}`, { revalidate: 60 }),
  getFeaturedProducts: async () => (await serverGet<Product[]>(`/products?featured=true`, { revalidate: 60 })) ?? [],
  getBestSellerProducts: async (limit = 8) => (await serverGet<Product[]>(`/products/best-sellers?limit=${limit}`, { revalidate: 300 })) ?? [],
  getAllActiveProducts: async () => (await serverGet<Product[]>(`/products`, { revalidate: 60 })) ?? [],
  getActiveProductsByCategory: async (idOrSlug: string) => (await serverGet<Product[]>(`/products?category=${encodeURIComponent(idOrSlug)}`, { revalidate: 60 })) ?? [],
};

export const categoriesServer = {
  getActiveCategories: async () => (await serverGet<Category[]>(`/categories`, { revalidate: 300 })) ?? [],
  getCategoryBySlug: (slug: string) => serverGet<Category>(`/categories/${encodeURIComponent(slug)}`, { revalidate: 300 }),
};

export const reviewsServer = {
  getShowcaseReviews: async (opts?: { minRating?: number; limit?: number }) =>
    (await serverGet<{ reviews: ShowcaseReview[]; aggregate: ReviewAggregate }>(`/reviews/showcase?minRating=${opts?.minRating ?? 4}&limit=${opts?.limit ?? 12}`, { revalidate: 300 })) ?? {
      reviews: [],
      aggregate: { average: 0, count: 0 },
    },
  getProductReviews: (slug: string) => serverGet<{ reviews: ProductReviewPublic[]; aggregate: ReviewAggregate }>(`/products/${encodeURIComponent(slug)}/reviews`, { revalidate: 120 }),
};
