"use client";

import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/auth.slice";
import cartReducer from "@/features/cart/cart.slice";
import { authApi } from "@/features/auth/auth.api";
import { geoApi } from "@/features/geo/geo.api";
import { ordersApi } from "@/features/orders/orders.api";
import { productsApi } from "@/features/products/products.api";
import { categoriesApi } from "@/features/categories/categories.api";
import { mediaApi } from "@/features/media/media.api";
import { storeApi } from "@/features/store/store.api";
import { testimonialsApi } from "@/features/testimonials/testimonials.api";
import { customersApi } from "@/features/customers/customers.api";
import { socialApi } from "@/features/social/social.api";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    [authApi.reducerPath]: authApi.reducer,
    [geoApi.reducerPath]: geoApi.reducer,
    [ordersApi.reducerPath]: ordersApi.reducer,
    [productsApi.reducerPath]: productsApi.reducer,
    [categoriesApi.reducerPath]: categoriesApi.reducer,
    [mediaApi.reducerPath]: mediaApi.reducer,
    [storeApi.reducerPath]: storeApi.reducer,
    [testimonialsApi.reducerPath]: testimonialsApi.reducer,
    [customersApi.reducerPath]: customersApi.reducer,
    [socialApi.reducerPath]: socialApi.reducer,
  },
  middleware: (getDefault) =>
    getDefault()
      .concat(authApi.middleware)
      .concat(geoApi.middleware)
      .concat(ordersApi.middleware)
      .concat(productsApi.middleware)
      .concat(categoriesApi.middleware)
      .concat(mediaApi.middleware)
      .concat(storeApi.middleware)
      .concat(testimonialsApi.middleware)
      .concat(customersApi.middleware)
      .concat(socialApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
