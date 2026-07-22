"use client";

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface CartItem {
  product_id: string;
  name: string;
  slug: string;
  main_image: string | null;
  price: number;
  quantity: number;
  theme_color?: string;
}

export interface CartState {
  /** false until the client has hydrated from localStorage. */
  hydrated: boolean;
  items: CartItem[];
}

const CART_KEY = "7alm_cart";

const initialState: CartState = {
  hydrated: false,
  items: [],
};

function persist(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // Storage errors (quota, private mode, etc.) are non-critical — the
    // cart still works in-memory for the rest of the session.
  }
}

/**
 * Client-only cart state — no server round-trip until checkout. Modeled on
 * `auth.slice.ts`'s hydrate/persist pattern (same repo conventions).
 */
const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    hydrateCart(state) {
      if (typeof window === "undefined") return;
      try {
        const raw = localStorage.getItem(CART_KEY);
        state.items = raw ? JSON.parse(raw) : [];
      } catch {
        state.items = [];
      }
      state.hydrated = true;
    },
    addItem(
      state,
      action: PayloadAction<{ item: Omit<CartItem, "quantity">; quantity?: number }>
    ) {
      const { item, quantity = 1 } = action.payload;
      const existing = state.items.find((i) => i.product_id === item.product_id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        state.items.push({ ...item, quantity });
      }
      persist(state.items);
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.product_id !== action.payload);
      persist(state.items);
    },
    updateQuantity(
      state,
      action: PayloadAction<{ product_id: string; quantity: number }>
    ) {
      const { product_id, quantity } = action.payload;
      if (quantity <= 0) {
        state.items = state.items.filter((i) => i.product_id !== product_id);
      } else {
        const existing = state.items.find((i) => i.product_id === product_id);
        if (existing) existing.quantity = quantity;
      }
      persist(state.items);
    },
    clearCart(state) {
      state.items = [];
      persist(state.items);
    },
  },
});

export const { hydrateCart, addItem, removeItem, updateQuantity, clearCart } =
  cartSlice.actions;
export default cartSlice.reducer;
