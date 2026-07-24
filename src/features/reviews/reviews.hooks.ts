"use client";

import { useCallback } from "react";
import {
  useGetModerationReviewsQuery,
  useGetProductReviewsQuery,
  useModerateReviewMutation,
  useSubmitReviewMutation,
} from "./reviews.api";
import type { ReviewStatus, SubmitReviewInput } from "@/features/shared/types";

/** Rating summary + approved reviews for a product page (`slug`-keyed). */
export function useProductReviews(slug: string) {
  const { data, isLoading, error } = useGetProductReviewsQuery(slug);

  return {
    reviews: data?.reviews ?? [],
    aggregate: data?.aggregate ?? { average: 0, count: 0 },
    isLoading,
    error,
  };
}

/** Verified-buyer submission flow for `/review/[token]`. */
export function useReviewSubmit() {
  const [submitReview, state] = useSubmitReviewMutation();

  const submit = useCallback(
    async (input: SubmitReviewInput) => {
      await submitReview(input).unwrap();
    },
    [submitReview],
  );

  return {
    submit,
    isLoading: state.isLoading,
    isSuccess: state.isSuccess,
    error: state.error,
  };
}

/** Admin moderation queue (approve/reject) — `/admin/reviews`. */
export function useReviewModeration(status: ReviewStatus | undefined = "pending") {
  const { data: reviews, isLoading, error, refetch } = useGetModerationReviewsQuery(status);
  const [moderateReview, moderateState] = useModerateReviewMutation();

  const approve = useCallback(
    (id: string) => moderateReview({ id, status: "approved" }).unwrap(),
    [moderateReview],
  );
  const reject = useCallback(
    (id: string) => moderateReview({ id, status: "rejected" }).unwrap(),
    [moderateReview],
  );

  return {
    reviews: reviews ?? [],
    isLoading,
    error,
    refetch,
    approve,
    reject,
    moderateState,
  };
}
