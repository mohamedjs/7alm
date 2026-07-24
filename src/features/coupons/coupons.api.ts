"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "@/lib/redux/api/baseQuery";
import type { Coupon, CouponInput, CouponValidationResult } from "@/features/shared/types";

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ValidateCouponRequest {
  code: string;
  subtotal: number;
  shippingCost: number;
  phone?: string;
}

/**
 * Coupons RTK Query slice — public checkout-preview validation + admin CRUD.
 * Modeled on `categoriesApi`/`testimonialsApi`.
 */
export const couponsApi = createApi({
  reducerPath: "couponsApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Coupon"],
  endpoints: (builder) => ({
    // PUBLIC — live checkout preview. A mutation (not a query) since it's
    // triggered imperatively by the "Apply" button, not on mount.
    validateCoupon: builder.mutation<CouponValidationResult, ValidateCouponRequest>({
      query: (body) => ({
        url: "/coupons/validate",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiEnvelope<CouponValidationResult>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to validate coupon");
        }
        return response.data;
      },
    }),

    // ADMIN CRUD
    getCoupons: builder.query<Coupon[], void>({
      query: () => "/admin/coupons",
      transformResponse: (response: ApiEnvelope<Coupon[]>) =>
        response.success && response.data ? response.data : [],
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Coupon" as const, id })),
              { type: "Coupon", id: "LIST" },
            ]
          : [{ type: "Coupon", id: "LIST" }],
    }),

    createCoupon: builder.mutation<Coupon, CouponInput>({
      query: (body) => ({
        url: "/admin/coupons",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiEnvelope<Coupon>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to create coupon");
        }
        return response.data;
      },
      invalidatesTags: [{ type: "Coupon", id: "LIST" }],
    }),

    updateCoupon: builder.mutation<Coupon, { id: string } & Partial<CouponInput>>({
      query: ({ id, ...body }) => ({
        url: `/admin/coupons/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: ApiEnvelope<Coupon>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to update coupon");
        }
        return response.data;
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "Coupon", id },
        { type: "Coupon", id: "LIST" },
      ],
    }),

    deleteCoupon: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/coupons/${id}`,
        method: "DELETE",
      }),
      transformResponse: (response: ApiEnvelope<unknown>) => {
        if (!response.success) {
          throw new Error(response.error || "Failed to delete coupon");
        }
      },
      invalidatesTags: (result, error, id) => [
        { type: "Coupon", id },
        { type: "Coupon", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useValidateCouponMutation,
  useGetCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
} = couponsApi;
