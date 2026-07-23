"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "@/lib/redux/api/baseQuery";
import type { Testimonial } from "@/features/shared/types";

export type TestimonialInput = {
  name_ar: string;
  name_en: string;
  role_ar: string;
  role_en: string;
  text_ar: string;
  text_en: string;
  rating: number;
  is_active: boolean;
};

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const testimonialsApi = createApi({
  reducerPath: "testimonialsApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Testimonial"],
  endpoints: (builder) => ({
    getTestimonials: builder.query<Testimonial[], void>({
      query: () => "/admin/testimonials",
      transformResponse: (response: ApiEnvelope<Testimonial[]>) =>
        response.success && response.data ? response.data : [],
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Testimonial" as const, id })),
              { type: "Testimonial", id: "LIST" },
            ]
          : [{ type: "Testimonial", id: "LIST" }],
    }),

    createTestimonial: builder.mutation<Testimonial, TestimonialInput>({
      query: (body) => ({
        url: "/admin/testimonials",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiEnvelope<Testimonial>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to create testimonial");
        }
        return response.data;
      },
      invalidatesTags: [{ type: "Testimonial", id: "LIST" }],
    }),

    updateTestimonial: builder.mutation<
      Testimonial,
      { id: string } & Partial<TestimonialInput>
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/testimonials/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: ApiEnvelope<Testimonial>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to update testimonial");
        }
        return response.data;
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "Testimonial", id },
        { type: "Testimonial", id: "LIST" },
      ],
    }),

    deleteTestimonial: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/testimonials/${id}`,
        method: "DELETE",
      }),
      transformResponse: (response: ApiEnvelope<unknown>) => {
        if (!response.success) {
          throw new Error(response.error || "Failed to delete testimonial");
        }
      },
      invalidatesTags: (result, error, id) => [
        { type: "Testimonial", id },
        { type: "Testimonial", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetTestimonialsQuery,
  useCreateTestimonialMutation,
  useUpdateTestimonialMutation,
  useDeleteTestimonialMutation,
} = testimonialsApi;
