"use client";

import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryApi, FetchArgs } from "@reduxjs/toolkit/query";
import type { RootState } from "@/lib/redux/store";
import { logout } from "@/features/auth/auth.slice";

/**
 * Wraps fetchBaseQuery to:
 *  - attach the admin bearer token from the auth slice to every request
 *  - transparently handle 401 responses by logging the user out
 *
 * Note: the landing-page endpoints (zones, create-order, ipinfo) don't require
 * a token — when none is present we simply send the request without auth.
 */
const rawBaseQuery = fetchBaseQuery({
  baseUrl: "/api",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth?.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const baseQueryWithAuth = async (
  args: string | FetchArgs,
  api: BaseQueryApi,
  extra: Parameters<typeof rawBaseQuery>[2],
) => {
  const result = await rawBaseQuery(args, api, extra);

  if (result.error?.status === 401) {
    // Token expired / invalid — force a logout.
    api.dispatch(logout());
  }

  return result;
};
