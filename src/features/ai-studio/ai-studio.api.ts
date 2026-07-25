"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "@/lib/redux/api/baseQuery";
import type { DesignIdea, DesignIdeaStatus, Trend, TrendInput } from "@/features/shared/types";

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const aiStudioApi = createApi({
  reducerPath: "aiStudioApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Trend", "DesignIdea"],
  endpoints: (builder) => ({
    getTrends: builder.query<Trend[], void>({
      query: () => "/admin/ai-studio/trends",
      transformResponse: (response: ApiEnvelope<Trend[]>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to fetch trends");
        }
        return response.data;
      },
      providesTags: [{ type: "Trend", id: "LIST" }],
    }),

    addTrend: builder.mutation<Trend, TrendInput>({
      query: (body) => ({
        url: "/admin/ai-studio/trends",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiEnvelope<Trend>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to add trend");
        }
        return response.data;
      },
      invalidatesTags: [{ type: "Trend", id: "LIST" }],
    }),

    getIdeas: builder.query<DesignIdea[], DesignIdeaStatus | undefined>({
      query: (status) =>
        status ? `/admin/ai-studio/ideas?status=${status}` : "/admin/ai-studio/ideas",
      transformResponse: (response: ApiEnvelope<DesignIdea[]>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to fetch design ideas");
        }
        return response.data;
      },
      providesTags: [{ type: "DesignIdea", id: "LIST" }],
    }),
  }),
});

export const { useGetTrendsQuery, useAddTrendMutation, useGetIdeasQuery } = aiStudioApi;
