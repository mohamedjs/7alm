"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useGetCustomerDetailQuery,
  useGetCustomersQuery,
  useUpdateCustomerMutation,
} from "./customers.api";

/**
 * Drives the customer list page: paginated + debounced-search fetch of
 * `CustomerWithStats[]` via RTK Query.
 */
export function useCustomersManager() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [searchQuery]);

  const { data, isLoading } = useGetCustomersQuery({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  });

  return {
    customers: data?.data ?? [],
    totalCount: data?.totalCount ?? 0,
    page,
    pageSize: 20,
    isLoading,
    searchQuery,
    setSearchQuery,
    setPage,
  };
}

/**
 * Drives the customer detail page: contact info, stats, order history,
 * address, plus a `updateCustomer` callback for saving notes/email.
 */
export function useCustomerDetail(id: string) {
  const { data, isLoading } = useGetCustomerDetailQuery(id, { skip: !id });
  const [updateCustomerMutation] = useUpdateCustomerMutation();

  const updateCustomer = useCallback(
    async (updates: { notes?: string; email?: string }) => {
      await updateCustomerMutation({ id, ...updates }).unwrap();
    },
    [id, updateCustomerMutation],
  );

  return {
    customer: data?.customer ?? null,
    stats: data?.stats ?? null,
    orders: data?.orders ?? [],
    address: data?.address ?? null,
    isLoading,
    updateCustomer,
  };
}
