"use client";

import { useCallback, useState } from "react";
import {
  useCreateCouponMutation,
  useDeleteCouponMutation,
  useGetCouponsQuery,
  useUpdateCouponMutation,
  useValidateCouponMutation,
  type ValidateCouponRequest,
} from "./coupons.api";
import type { Coupon, CouponInput, CouponValidationResult } from "@/features/shared/types";

const EMPTY_FORM: CouponInput = {
  code: "",
  type: "percentage",
  value: 0,
  min_order_total: 0,
  max_discount: null,
  first_order_only: false,
  per_customer_limit: null,
  usage_limit: null,
  starts_at: null,
  expires_at: null,
  is_active: true,
};

/** Admin coupon CRUD manager — mirrors `useCategoriesManager`/`useTestimonialsManager`. */
export function useCouponsManager() {
  const { data: coupons, isLoading, error, refetch } = useGetCouponsQuery();

  const [createCoupon, createState] = useCreateCouponMutation();
  const [updateCoupon, updateState] = useUpdateCouponMutation();
  const [deleteCoupon, deleteState] = useDeleteCouponMutation();

  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<CouponInput>(EMPTY_FORM);

  const startCreate = useCallback(() => {
    setEditingCoupon(null);
    setFormData(EMPTY_FORM);
  }, []);

  const startEdit = useCallback((coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      min_order_total: coupon.min_order_total,
      max_discount: coupon.max_discount,
      first_order_only: coupon.first_order_only,
      per_customer_limit: coupon.per_customer_limit,
      usage_limit: coupon.usage_limit,
      starts_at: coupon.starts_at,
      expires_at: coupon.expires_at,
      is_active: coupon.is_active,
    });
  }, []);

  const saveCoupon = useCallback(
    async (data: CouponInput) => {
      if (editingCoupon) {
        await updateCoupon({ id: editingCoupon.id, ...data }).unwrap();
      } else {
        await createCoupon(data).unwrap();
      }
    },
    [createCoupon, updateCoupon, editingCoupon],
  );

  const removeCoupon = useCallback(
    async (id: string) => {
      await deleteCoupon(id).unwrap();
    },
    [deleteCoupon],
  );

  return {
    coupons: coupons ?? [],
    isLoading,
    error,
    refetch,
    editingCoupon,
    setEditingCoupon,
    formData,
    setFormData,
    startCreate,
    startEdit,
    saveCoupon,
    removeCoupon,
    createState,
    updateState,
    deleteState,
  };
}

/**
 * Checkout coupon-apply flow — imperative "Apply" button that calls
 * `/api/coupons/validate` and keeps the last successful result (discount
 * preview) + the applied code around for the order submission payload.
 */
export function useCouponApply() {
  const [validateCoupon, state] = useValidateCouponMutation();
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [result, setResult] = useState<CouponValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback(
    async (params: ValidateCouponRequest) => {
      setError(null);
      try {
        const res = await validateCoupon(params).unwrap();
        if (!res.valid) {
          setError(res.error || "الكوبون غير صالح.");
          setResult(null);
          setAppliedCode(null);
          return;
        }
        setResult(res);
        setAppliedCode(params.code.trim().toUpperCase());
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "تعذر التحقق من الكوبون.";
        setError(message);
        setResult(null);
        setAppliedCode(null);
      }
    },
    [validateCoupon],
  );

  const clear = useCallback(() => {
    setResult(null);
    setAppliedCode(null);
    setError(null);
  }, []);

  return {
    apply,
    clear,
    isLoading: state.isLoading,
    result,
    appliedCode,
    error,
  };
}
