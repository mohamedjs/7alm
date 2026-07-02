"use client";

import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/auth.slice";
import { authApi } from "@/features/auth/auth.api";
import { geoApi } from "@/features/geo/geo.api";
import { ordersApi } from "@/features/orders/orders.api";
import { productsApi } from "@/features/products/products.api";
import { mediaApi } from "@/features/media/media.api";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [geoApi.reducerPath]: geoApi.reducer,
    [ordersApi.reducerPath]: ordersApi.reducer,
    [productsApi.reducerPath]: productsApi.reducer,
    [mediaApi.reducerPath]: mediaApi.reducer,
  },
  middleware: (getDefault) =>
    getDefault()
      .concat(authApi.middleware)
      .concat(geoApi.middleware)
      .concat(ordersApi.middleware)
      .concat(productsApi.middleware)
      .concat(mediaApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
