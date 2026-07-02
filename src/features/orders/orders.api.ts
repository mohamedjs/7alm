"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "@/lib/redux/api/baseQuery";
import type {
  CreateOrderInput,
  OrderWithDetails,
  ShippingProviderName,
} from "@/features/shared/types";

export type { OrderStatus, OrderWithDetails } from "@/features/shared/types";

export interface CreateOrderResponse {
  orderId: string;
}

export interface UpdateOrderStatusRequest {
  status: string;
  shipping_provider?: ShippingProviderName;
}

export interface UpdateOrderStatusResponse {
  trackingId?: string;
  message?: string;
}

export type OrdersFilter = "pending" | "all";

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  orderId?: string;
  trackingId?: string;
  message?: string;
}

export const ordersApi = createApi({
  reducerPath: "ordersApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Order"],
  endpoints: (builder) => ({
    getOrders: builder.query<OrderWithDetails[], OrdersFilter>({
      query: (filter) => ({
        url: "/orders",
        params: filter === "pending" ? { status: "pending" } : undefined,
      }),
      transformResponse: (response: ApiEnvelope<OrderWithDetails[]>) =>
        response.success && response.data ? response.data : [],
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Order" as const, id })),
              { type: "Order", id: "LIST" },
            ]
          : [{ type: "Order", id: "LIST" }],
    }),

    createOrder: builder.mutation<CreateOrderResponse, CreateOrderInput>({
      query: (body) => ({
        url: "/orders",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiEnvelope<CreateOrderResponse>) => {
        if (!response.success || !response.orderId) {
          throw new Error(response.error || "Failed to create order");
        }
        return { orderId: response.orderId };
      },
    }),

    updateOrderStatus: builder.mutation<
      UpdateOrderStatusResponse,
      { orderId: string } & UpdateOrderStatusRequest
    >({
      query: ({ orderId, ...body }) => ({
        url: `/orders/${orderId}/status`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: ApiEnvelope<UpdateOrderStatusResponse>) => {
        if (!response.success) {
          throw new Error(response.error || "Failed to update order status");
        }
        return {
          trackingId: response.trackingId,
          message: response.message,
        };
      },
      invalidatesTags: (result, error, { orderId }) => [
        { type: "Order", id: orderId },
        { type: "Order", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
} = ordersApi;
