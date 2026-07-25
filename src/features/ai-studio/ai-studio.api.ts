"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "@/lib/redux/api/baseQuery";
import type { AdCampaign, AdCampaignStatus } from "@/features/shared/types";

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UpdateCampaignStatusParams {
  id: string;
  status: AdCampaignStatus;
}

export interface GenerateCampaignImageParams {
  id: string;
  prompt?: string;
}

export const aiStudioApi = createApi({
  reducerPath: "aiStudioApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Campaign"],
  endpoints: (builder) => ({
    getCampaigns: builder.query<AdCampaign[], AdCampaignStatus | undefined>({
      query: (status) =>
        status ? `/admin/ai-studio/campaigns?status=${status}` : `/admin/ai-studio/campaigns`,
      transformResponse: (response: ApiEnvelope<AdCampaign[]>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to fetch campaigns");
        }
        return response.data;
      },
      providesTags: [{ type: "Campaign", id: "LIST" }],
    }),

    updateCampaignStatus: builder.mutation<AdCampaign, UpdateCampaignStatusParams>({
      query: ({ id, status }) => ({
        url: `/admin/ai-studio/campaigns/${id}`,
        method: "PATCH",
        body: { status },
      }),
      transformResponse: (response: ApiEnvelope<AdCampaign>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to update campaign");
        }
        return response.data;
      },
      invalidatesTags: [{ type: "Campaign", id: "LIST" }],
    }),

    generateCampaignImage: builder.mutation<AdCampaign, GenerateCampaignImageParams>({
      query: ({ id, prompt }) => ({
        url: `/admin/ai-studio/campaigns/${id}/image`,
        method: "POST",
        body: { prompt },
      }),
      transformResponse: (response: ApiEnvelope<AdCampaign>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to generate image");
        }
        return response.data;
      },
      invalidatesTags: [{ type: "Campaign", id: "LIST" }],
    }),
  }),
});

export const {
  useGetCampaignsQuery,
  useUpdateCampaignStatusMutation,
  useGenerateCampaignImageMutation,
} = aiStudioApi;
