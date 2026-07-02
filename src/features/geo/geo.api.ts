"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "@/lib/redux/api/baseQuery";

export interface Zone {
  id: string;
  arabic_name: string;
  english_name: string;
  city_name: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const geoApi = createApi({
  reducerPath: "geoApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Zone"],
  endpoints: (builder) => ({
    getZones: builder.query<Zone[], void>({
      query: () => "/zones",
      transformResponse: (response: ApiEnvelope<Zone[]>) =>
        response.success && response.data ? response.data : [],
      providesTags: ["Zone"],
    }),
  }),
});

export const { useGetZonesQuery } = geoApi;
