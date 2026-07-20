"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "@/lib/redux/api/baseQuery";
import type { Category } from "@/features/shared/types";

export type CategoryInput = Partial<Category> & {
  name_ar: string;
  name_en: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
};

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const categoriesApi = createApi({
  reducerPath: "categoriesApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Category"],
  endpoints: (builder) => ({
    getCategories: builder.query<Category[], void>({
      query: () => "/admin/categories",
      transformResponse: (response: ApiEnvelope<Category[]>) =>
        response.success && response.data ? response.data : [],
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Category" as const, id })),
              { type: "Category", id: "LIST" },
            ]
          : [{ type: "Category", id: "LIST" }],
    }),

    createCategory: builder.mutation<Category, CategoryInput>({
      query: (body) => ({
        url: "/admin/categories",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiEnvelope<Category>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to create category");
        }
        return response.data;
      },
      invalidatesTags: [{ type: "Category", id: "LIST" }],
    }),

    updateCategory: builder.mutation<
      Category,
      { id: string } & Partial<CategoryInput>
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/categories/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: ApiEnvelope<Category>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to update category");
        }
        return response.data;
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "Category", id },
        { type: "Category", id: "LIST" },
      ],
    }),

    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/categories/${id}`,
        method: "DELETE",
      }),
      transformResponse: (response: ApiEnvelope<unknown>) => {
        if (!response.success) {
          throw new Error(response.error || "Failed to delete category");
        }
      },
      invalidatesTags: (result, error, id) => [
        { type: "Category", id },
        { type: "Category", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApi;
