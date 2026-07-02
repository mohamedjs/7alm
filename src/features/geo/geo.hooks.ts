"use client";

import { useGetZonesQuery } from "./geo.api";

/** Convenience hook for the landing-page zone dropdown. */
export function useZones() {
  const { data, isLoading, error } = useGetZonesQuery();
  return {
    zones: data ?? [],
    isLoading,
    error,
  };
}
