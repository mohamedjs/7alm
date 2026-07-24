"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  addItem as addItemAction,
  clearCart as clearCartAction,
  hydrateCart as hydrateCartAction,
  removeItem as removeItemAction,
  updateQuantity as updateQuantityAction,
  type CartItem,
} from "./cart.slice";
import { useCreateOrderMutation } from "@/features/orders/orders.api";
import { useZones } from "@/features/geo/geo.hooks";
import { useIpInfo, usePlatformSource } from "@/features/checkout/checkout.hooks";
import type { CreateOrderInput } from "@/features/shared/types";
import { useCouponApply } from "@/features/coupons/coupons.hooks";

/**
 * Cart selectors + action dispatchers. Hydrates from localStorage on first
 * use (mirrors `useAuth`'s hydrate pattern).
 */
export function useCart() {
  const dispatch = useAppDispatch();
  const { items, hydrated } = useAppSelector((state) => state.cart);

  useEffect(() => {
    if (!hydrated) dispatch(hydrateCartAction());
  }, [hydrated, dispatch]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      dispatch(addItemAction({ item, quantity }));
    },
    [dispatch]
  );

  const removeItem = useCallback(
    (productId: string) => dispatch(removeItemAction(productId)),
    [dispatch]
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) =>
      dispatch(updateQuantityAction({ product_id: productId, quantity })),
    [dispatch]
  );

  const clearCart = useCallback(() => dispatch(clearCartAction()), [dispatch]);

  return {
    items,
    hydrated,
    itemCount,
    subtotal,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };
}

/**
 * Cart checkout form state + submission — modeled on `useCheckoutForm` in
 * `checkout.hooks.ts`, but submits the cart's items as
 * `CreateOrderInput.items[]` instead of a single `product_id`.
 */
export function useCartCheckoutForm() {
  const { items, subtotal, clearCart } = useCart();
  const { zones, isLoading: zonesLoading } = useZones();
  const ipInfo = useIpInfo();
  const platformSource = usePlatformSource();
  const [createOrder, createOrderState] = useCreateOrderMutation();
  const {
    apply: applyCouponInternal,
    clear: clearCoupon,
    isLoading: couponLoading,
    result: couponResult,
    appliedCode,
    error: couponError,
  } = useCouponApply();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [streetDetails, setStreetDetails] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const loading = createOrderState.isLoading;

  const shippingCost = useMemo(() => {
    if (!zoneId) return 0;
    const zone = zones.find((z) => z.id === zoneId);
    return zone?.shipping_price ?? 0;
  }, [zoneId, zones]);

  const discountAmount = couponResult?.discountAmount ?? 0;
  const finalShippingCost = couponResult?.finalShipping ?? shippingCost;
  const total = Math.max(0, subtotal - discountAmount) + finalShippingCost;

  const applyCoupon = useCallback(async () => {
    if (!couponCode.trim()) return;
    await applyCouponInternal({
      code: couponCode.trim(),
      subtotal,
      shippingCost,
      phone: phone || undefined,
    });
  }, [applyCouponInternal, couponCode, subtotal, shippingCost, phone]);

  const removeCoupon = useCallback(() => {
    setCouponCode("");
    clearCoupon();
  }, [clearCoupon]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (items.length === 0) {
        setError("السلة فارغة.");
        return;
      }

      try {
        const payload: CreateOrderInput = {
          full_name: fullName,
          phone,
          email: email || undefined,
          zone_id: zoneId,
          street_details: streetDetails,
          items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
          platform_source: platformSource || undefined,
          ip_address: ipInfo?.ip,
          ip_country: ipInfo?.country,
          ip_city: ipInfo?.city,
          coupon_code: appliedCode || undefined,
        };
        await createOrder(payload).unwrap();
        setSuccess(true);
        clearCart();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "حدث خطأ. يرجى المحاولة مرة أخرى.";
        setError(message);
      }
    },
    [items, fullName, phone, email, zoneId, streetDetails, platformSource, ipInfo, createOrder, clearCart, appliedCode]
  );

  return {
    items,
    subtotal,
    shippingCost,
    total,
    zones,
    zonesLoading,
    fields: { fullName, phone, email, zoneId, streetDetails },
    setFullName,
    setPhone,
    setEmail,
    setZoneId,
    setStreetDetails,
    success,
    error,
    loading,
    handleSubmit,
    coupon: {
      code: couponCode,
      setCode: setCouponCode,
      apply: applyCoupon,
      remove: removeCoupon,
      isLoading: couponLoading,
      appliedCode,
      discountAmount,
      finalShippingCost,
      error: couponError,
    },
  };
}
