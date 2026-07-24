"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "@/lib/redux/api/baseQuery";
import type {
  Customer,
  CustomerDetail,
  CustomerWithStats,
  PaginatedResponse,
  WhatsAppMessage,
} from "@/features/shared/types";

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GetCustomersParams {
  page: number;
  limit: number;
  search?: string;
}

export interface GetMessagesParams {
  customerId: string;
  page: number;
  limit: number;
}

export interface UpdateCustomerParams {
  id: string;
  notes?: string;
  email?: string;
}

export interface SendMessageParams {
  customerId: string;
  body: string;
}

export const customersApi = createApi({
  reducerPath: "customersApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Customer", "CustomerDetail", "WhatsAppMessage"],
  endpoints: (builder) => ({
    getCustomers: builder.query<
      PaginatedResponse<CustomerWithStats>,
      GetCustomersParams
    >({
      query: ({ page, limit, search }) => {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        if (search) params.set("search", search);
        return `/admin/customers?${params.toString()}`;
      },
      transformResponse: (
        response: ApiEnvelope<PaginatedResponse<CustomerWithStats>>,
      ) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to fetch customers");
        }
        return response.data;
      },
      providesTags: [{ type: "Customer", id: "LIST" }],
    }),

    getCustomerDetail: builder.query<CustomerDetail, string>({
      query: (id) => `/admin/customers/${id}`,
      transformResponse: (response: ApiEnvelope<CustomerDetail>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to fetch customer");
        }
        return response.data;
      },
      providesTags: (result, error, id) => [{ type: "CustomerDetail", id }],
    }),

    getMessages: builder.query<
      PaginatedResponse<WhatsAppMessage>,
      GetMessagesParams
    >({
      query: ({ customerId, page, limit }) =>
        `/admin/customers/${customerId}/messages?page=${page}&limit=${limit}`,
      transformResponse: (
        response: ApiEnvelope<PaginatedResponse<WhatsAppMessage>>,
      ) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to fetch messages");
        }
        return response.data;
      },
      providesTags: (result, error, { customerId }) => [
        { type: "WhatsAppMessage", id: customerId },
      ],
    }),

    updateCustomer: builder.mutation<Customer, UpdateCustomerParams>({
      query: ({ id, ...body }) => ({
        url: `/admin/customers/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: ApiEnvelope<Customer>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to update customer");
        }
        return response.data;
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "CustomerDetail", id },
        { type: "Customer", id: "LIST" },
      ],
    }),

    sendMessage: builder.mutation<WhatsAppMessage, SendMessageParams>({
      query: ({ customerId, body }) => ({
        url: `/admin/customers/${customerId}/messages`,
        method: "POST",
        body: { body },
      }),
      transformResponse: (response: ApiEnvelope<WhatsAppMessage>) => {
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to send message");
        }
        return response.data;
      },
      invalidatesTags: (result, error, { customerId }) => [
        { type: "WhatsAppMessage", id: customerId },
      ],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetCustomerDetailQuery,
  useGetMessagesQuery,
  useUpdateCustomerMutation,
  useSendMessageMutation,
} = customersApi;
