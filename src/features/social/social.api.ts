"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "@/lib/redux/api/baseQuery";
import type { SocialConnectionPublic, SocialPlatform } from "@/features/shared/types";

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const socialApi = createApi({
  reducerPath: "socialApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Connection"],
  endpoints: (builder) => ({
    getConnections: builder.query<SocialConnectionPublic[], void>({
      query: () => "/admin/connections",
      transformResponse: (response: ApiEnvelope<SocialConnectionPublic[]>) =>
        response.success && response.data ? response.data : [],
      providesTags: [{ type: "Connection", id: "LIST" }],
    }),

    initiateConnect: builder.mutation<{ authUrl: string }, SocialPlatform>({
      query: (platform) => ({
        url: `/admin/connections/${platform}/authorize`,
        method: "POST",
      }),
      transformResponse: (response: ApiEnvelope<{ authUrl: string }>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to start the connection.");
        }
        return response.data;
      },
    }),

    disconnect: builder.mutation<void, SocialPlatform>({
      query: (platform) => ({
        url: `/admin/connections/${platform}`,
        method: "DELETE",
      }),
      transformResponse: (response: ApiEnvelope<unknown>) => {
        if (!response.success) {
          throw new Error(response.error || "Failed to disconnect.");
        }
      },
      invalidatesTags: [{ type: "Connection", id: "LIST" }],
    }),
  }),
});

export const {
  useGetConnectionsQuery,
  useInitiateConnectMutation,
  useDisconnectMutation,
} = socialApi;
