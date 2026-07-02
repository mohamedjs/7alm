"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "@/lib/redux/api/baseQuery";
import type { Product as SharedProduct } from "@/features/shared/types";

export type Product = SharedProduct & { video_url?: string | null };

export type ProductInput = Partial<Product> & {
  name: string;
  slug: string;
  price: number;
  quantity: number;
};

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const productsApi = createApi({
  reducerPath: "productsApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Product"],
  endpoints: (builder) => ({
    getProducts: builder.query<Product[], void>({
      query: () => "/admin/products",
      transformResponse: (response: ApiEnvelope<Product[]>) =>
        response.success && response.data ? response.data : [],
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Product" as const, id })),
              { type: "Product", id: "LIST" },
            ]
          : [{ type: "Product", id: "LIST" }],
    }),

    createProduct: builder.mutation<Product, ProductInput>({
      query: (body) => ({
        url: "/admin/products",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiEnvelope<Product>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to create product");
        }
        return response.data;
      },
      invalidatesTags: [{ type: "Product", id: "LIST" }],
    }),

    updateProduct: builder.mutation<
      Product,
      { id: string } & Partial<ProductInput>
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/products/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: ApiEnvelope<Product>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to update product");
        }
        return response.data;
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
      ],
    }),

    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/products/${id}`,
        method: "DELETE",
      }),
      transformResponse: (response: ApiEnvelope<unknown>) => {
        if (!response.success) {
          throw new Error(response.error || "Failed to delete product");
        }
      },
      invalidatesTags: (result, error, id) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productsApi;
