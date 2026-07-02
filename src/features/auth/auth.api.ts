"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "@/lib/redux/api/baseQuery";
import type { AdminUser } from "./auth.slice";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refresh_token?: string;
  user: AdminUser;
}

/** Wraps the API envelope `{ success, data | error }` used across the app. */
interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiEnvelope<LoginResponse>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Login failed");
        }
        return response.data;
      },
    }),
  }),
});

export const { useLoginMutation } = authApi;
