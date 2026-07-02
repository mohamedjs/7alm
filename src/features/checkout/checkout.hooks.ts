"use client";

import { useCallback, useEffect, useState } from "react";
import { useCreateOrderMutation } from "@/features/orders/orders.api";
import type { CreateOrderInput } from "@/features/shared/types";
import { useZones } from "@/features/geo/geo.hooks";

export interface IpInfo {
  ip: string;
  country: string;
  city: string;
}

interface IpInfoResponse {
  ip?: string;
  country?: string;
  city?: string;
}

/**
 * Fetches the visitor's IP geolocation from ipinfo.io (non-critical).
 * Returns `null` if the request fails — the checkout still works without it.
 */
export function useIpInfo() {
  const [ipInfo, setIpInfo] = useState<IpInfo | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_IPINFO_TOKEN;
    const url = token
      ? `https://ipinfo.io/json?token=${token}`
      : "https://ipinfo.io/json";

    let cancelled = false;
    fetch(url)
      .then((res) => res.json())
      .then((data: IpInfoResponse) => {
        if (cancelled) return;
        setIpInfo({
          ip: data.ip || "",
          country: data.country || "",
          city: data.city || "",
        });
      })
      .catch(() => {
        // IP info is non-critical
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return ipInfo;
}

/**
 * Reads the `utm_source` / `source` query param from the current URL once.
 * Uses a lazy initializer so there's no extra render cycle.
 */
export function usePlatformSource() {
  const [platformSource] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("utm_source") || params.get("source") || "";
  });
  return platformSource;
}

export interface CheckoutFormValues {
  fullName: string;
  phone: string;
  email: string;
  zoneId: string;
  streetDetails: string;
}

/**
 * Orchestrates order creation from the landing-page checkout form.
 * Components only call `submitOrder(values)` — all the metadata
 * (IP info, platform source) is injected here.
 */
export function useCheckout() {
  const ipInfo = useIpInfo();
  const platformSource = usePlatformSource();
  const [createOrder, createOrderState] = useCreateOrderMutation();

  const submitOrder = useCallback(
    async (values: CheckoutFormValues) => {
      const payload: CreateOrderInput = {
        full_name: values.fullName,
        phone: values.phone,
        email: values.email || undefined,
        zone_id: values.zoneId,
        street_details: values.streetDetails,
        platform_source: platformSource || undefined,
        ip_address: ipInfo?.ip,
        ip_country: ipInfo?.country,
        ip_city: ipInfo?.city,
      };
      return createOrder(payload).unwrap();
    },
    [createOrder, ipInfo, platformSource],
  );

  return {
    submitOrder,
    createOrderState,
    /** The phone used in the success screen confirmation message. */
    ipInfo,
    platformSource,
  };
}

/**
 * Manages the checkout form field state + submission flow.
 * The component only renders — all state and logic lives here.
 */
export function useCheckoutForm() {
  const { zones, isLoading: zonesLoading } = useZones();
  const { submitOrder, createOrderState } = useCheckout();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [streetDetails, setStreetDetails] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const loading = createOrderState.isLoading;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      try {
        await submitOrder({
          fullName,
          phone,
          email,
          zoneId,
          streetDetails,
        });
        setSuccess(true);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "حدث خطأ. يرجى المحاولة مرة أخرى.";
        setError(message);
      }
    },
    [submitOrder, fullName, phone, email, zoneId, streetDetails],
  );

  return {
    zones,
    zonesLoading,
    fields: {
      fullName,
      phone,
      email,
      zoneId,
      streetDetails,
    },
    setFullName,
    setPhone,
    setEmail,
    setZoneId,
    setStreetDetails,
    success,
    error,
    loading,
    handleSubmit,
  };
}
