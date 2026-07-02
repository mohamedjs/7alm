"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "@/lib/redux/api/baseQuery";

interface ApiEnvelope {
  success: boolean;
  url?: string;
  error?: string;
}

export const mediaApi = createApi({
  reducerPath: "mediaApi",
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    uploadFile: builder.mutation<string, File>({
      query: (file) => {
        const body = new FormData();
        body.append("file", file);
        return {
          url: "/admin/upload",
          method: "POST",
          body,
        };
      },
      transformResponse: (response: ApiEnvelope) => {
        if (!response.success || !response.url) {
          throw new Error(response.error || "Failed to upload file");
        }
        return response.url;
      },
    }),
  }),
});

export const { useUploadFileMutation } = mediaApi;
