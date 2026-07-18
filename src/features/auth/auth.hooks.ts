"use client";

import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useLoginMutation } from "./auth.api";
import {
  hydrateAuth,
  logout as logoutAction,
  setCredentials,
} from "./auth.slice";
import type { RootState } from "@/lib/redux/store";
import { useAppSelector } from "@/lib/redux/hooks";

/**
 * High-level auth hook used by components.
 * Components never touch fetch / localStorage / dispatch directly.
 */
export function useAuth() {
  const dispatch = useDispatch();
  const { token, user, hydrated } = useAppSelector((s: RootState) => s.auth);
  const [login, loginState] = useLoginMutation();

  const loginWithCredentials = useCallback(
    async (email: string, password: string) => {
      const data = await login({ email, password }).unwrap();
      dispatch(setCredentials({ token: data.token, user: data.user }));
      return data;
    },
    [dispatch, login],
  );

  const logout = useCallback(() => {
    // Clear the httpOnly cookie so the middleware blocks /admin pages again.
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    dispatch(logoutAction());
  }, [dispatch]);
  const hydrate = useCallback(() => dispatch(hydrateAuth()), [dispatch]);

  return {
    token,
    user,
    hydrated,
    isAuthenticated: Boolean(token),
    login: loginWithCredentials,
    logout,
    hydrate,
    loginState,
  };
}
