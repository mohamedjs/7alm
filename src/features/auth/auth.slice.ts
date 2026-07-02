"use client";

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
}

export interface AuthState {
  /** null until the client has hydrated from localStorage */
  hydrated: boolean;
  token: string | null;
  user: AdminUser | null;
}

const TOKEN_KEY = "7alm_admin_token";
const USER_KEY = "7alm_admin_user";

const initialState: AuthState = {
  hydrated: false,
  token: null,
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** Restore auth state from localStorage on the client. */
    hydrateAuth(state) {
      if (typeof window === "undefined") return;
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const userJson = localStorage.getItem(USER_KEY);
        state.token = token;
        state.user = userJson ? JSON.parse(userJson) : null;
      } catch {
        state.token = null;
        state.user = null;
      }
      state.hydrated = true;
    },
    setCredentials(
      state,
      action: PayloadAction<{ token: string; user: AdminUser }>,
    ) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.hydrated = true;
      if (typeof window !== "undefined") {
        localStorage.setItem(TOKEN_KEY, action.payload.token);
        localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user));
      }
    },
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem(TOKEN_KEY, action.payload);
      }
    },
    logout(state) {
      state.token = null;
      state.user = null;
      state.hydrated = true;
      if (typeof window !== "undefined") {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    },
  },
});

export const { hydrateAuth, setCredentials, setToken, logout } =
  authSlice.actions;
export default authSlice.reducer;
