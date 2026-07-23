import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "@/lib/redux/api/baseQuery";
import type { Testimonial } from "../shared/types";

export const testimonialsApi = createApi({
  reducerPath: "testimonialsApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Testimonials"],
  endpoints: (builder) => ({
    getTestimonials: builder.query<Testimonial[], void>({
      query: () => "/admin/testimonials",
      providesTags: ["Testimonials"],
    }),
    createTestimonial: builder.mutation<Testimonial, Omit<Testimonial, "id" | "created_at">>({
      query: (body) => ({
        url: "/admin/testimonials",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Testimonials"],
    }),
    updateTestimonial: builder.mutation<Testimonial, { id: string; updates: Partial<Omit<Testimonial, "id" | "created_at">> }>({
      query: ({ id, updates }) => ({
        url: `/admin/testimonials/${id}`,
        method: "PUT",
        body: updates,
      }),
      invalidatesTags: ["Testimonials"],
    }),
    deleteTestimonial: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/testimonials/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Testimonials"],
    }),
  }),
});

export const {
  useGetTestimonialsQuery,
  useCreateTestimonialMutation,
  useUpdateTestimonialMutation,
  useDeleteTestimonialMutation,
} = testimonialsApi;
