"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "@/lib/redux/api/baseQuery";
import type { Category, Product } from "@/features/shared/types";

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface StoreProductFilters {
  category?: string;
  featured?: boolean;
}

/**
 * Storefront read layer (RTK Query) — hits the public, unauthenticated
 * `/api/products` and `/api/categories` routes (never `/admin/*`). Modeled
 * directly on `geoApi` (also public, also uses `baseQueryWithAuth` purely
 * for its request/401 plumbing — no token is required or sent when the
 * visitor isn't an authenticated admin).
 */
export const storeApi = createApi({
  reducerPath: "storeApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["StoreProduct", "StoreCategory"],
  endpoints: (builder) => ({
    getStoreProducts: builder.query<Product[], StoreProductFilters | void>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters?.category) params.set("category", filters.category);
        if (filters?.featured) params.set("featured", "true");
        const qs = params.toString();
        return `/products${qs ? `?${qs}` : ""}`;
      },
      transformResponse: (response: ApiEnvelope<Product[]>) =>
        response.success && response.data ? response.data : [],
      providesTags: [{ type: "StoreProduct", id: "LIST" }],
    }),

    getFeaturedProducts: builder.query<Product[], void>({
      query: () => "/products?featured=true",
      transformResponse: (response: ApiEnvelope<Product[]>) =>
        response.success && response.data ? response.data : [],
      providesTags: [{ type: "StoreProduct", id: "FEATURED" }],
    }),

    getStoreCategories: builder.query<Category[], void>({
      query: () => "/categories",
      transformResponse: (response: ApiEnvelope<Category[]>) =>
        response.success && response.data ? response.data : [],
      providesTags: [{ type: "StoreCategory", id: "LIST" }],
    }),
  }),
});

export const {
  useGetStoreProductsQuery,
  useGetFeaturedProductsQuery,
  useGetStoreCategoriesQuery,
} = storeApi;
