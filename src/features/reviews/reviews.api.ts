"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "@/lib/redux/api/baseQuery";
import type {
  ProductReview,
  ProductReviewPublic,
  ReviewAggregate,
  ReviewStatus,
  SubmitReviewInput,
} from "@/features/shared/types";

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProductReviewsResult {
  reviews: ProductReviewPublic[];
  aggregate: ReviewAggregate;
}

/**
 * Reviews RTK Query slice — public read/submit (verified-buyer, token-gated)
 * + admin moderation. Modeled on `categoriesApi`/`testimonialsApi`.
 */
export const reviewsApi = createApi({
  reducerPath: "reviewsApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["ProductReviews", "ModerationReview"],
  endpoints: (builder) => ({
    // PUBLIC — approved reviews + aggregate for a product, by slug.
    getProductReviews: builder.query<ProductReviewsResult, string>({
      query: (slug) => `/products/${slug}/reviews`,
      transformResponse: (response: ApiEnvelope<ProductReviewsResult>) =>
        response.success && response.data
          ? response.data
          : { reviews: [], aggregate: { average: 0, count: 0 } },
      providesTags: (result, error, slug) => [{ type: "ProductReviews", id: slug }],
    }),

    // PUBLIC — token-gated verified-buyer submission.
    submitReview: builder.mutation<void, SubmitReviewInput>({
      query: (body) => ({
        url: "/reviews",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiEnvelope<unknown>) => {
        if (!response.success) {
          throw new Error(response.error || "Failed to submit review");
        }
      },
    }),

    // ADMIN — moderation queue, optionally filtered by status.
    getModerationReviews: builder.query<ProductReview[], ReviewStatus | undefined>({
      query: (status) => ({
        url: "/admin/reviews",
        params: status ? { status } : undefined,
      }),
      transformResponse: (response: ApiEnvelope<ProductReview[]>) =>
        response.success && response.data ? response.data : [],
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "ModerationReview" as const, id })),
              { type: "ModerationReview", id: "LIST" },
            ]
          : [{ type: "ModerationReview", id: "LIST" }],
    }),

    // ADMIN — approve/reject.
    moderateReview: builder.mutation<
      ProductReview,
      { id: string; status: "approved" | "rejected" }
    >({
      query: ({ id, status }) => ({
        url: `/admin/reviews/${id}`,
        method: "PATCH",
        body: { status },
      }),
      transformResponse: (response: ApiEnvelope<ProductReview>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to update review");
        }
        return response.data;
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "ModerationReview", id },
        { type: "ModerationReview", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetProductReviewsQuery,
  useSubmitReviewMutation,
  useGetModerationReviewsQuery,
  useModerateReviewMutation,
} = reviewsApi;
