"use client";

import { useEffect } from "react";
import Image from "next/image";
import type { OrderWithDetails } from "@/features/orders/orders.api";
import type { OrderStatus } from "@/features/shared/types";
import { OrderStateMachine } from "@/lib/orderStateMachine";

interface OrderDetailsDrawerProps {
  order: OrderWithDetails | null;
  onClose: () => void;
  onChangeStatus: (orderId: string, nextStatus: OrderStatus) => void;
  approvingId: string | null;
}

const platformIcons: Record<string, string> = {
  facebook: "📘",
  instagram: "📸",
  tiktok: "🎵",
  google: "🔍",
  website: "🌐",
};

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-sm shrink-0">{label}</span>
      <span
        className={`text-gray-900 text-sm text-right break-words ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="flex items-center gap-2 text-gray-900 font-bold text-sm mb-3">
        <span className="text-lg">{icon}</span>
        {title}
      </h4>
      <div className="space-y-0">{children}</div>
    </div>
  );
}

export default function OrderDetailsDrawer({
  order,
  onClose,
  onChangeStatus,
  approvingId,
}: OrderDetailsDrawerProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (order) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [order, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!order) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [order]);

  if (!order) return null;

  const state = OrderStateMachine[order.status];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      />

      {/* Drawer — slides from the right (LTR) */}
      <div
        className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Order Details</h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              #{order.id.slice(0, 8)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Status banner */}
          <div
            className={`inline-flex px-4 py-2 rounded-full text-sm font-medium border ${
              state?.colorClass || OrderStateMachine.pending.colorClass
            }`}
          >
            {state?.label || order.status}
          </div>

          {/* Customer */}
          <Section title="Customer" icon="👤">
            <DetailRow label="Name" value={order.customer.full_name} />
            <DetailRow
              label="Phone"
              value={
                <a
                  href={`tel:${order.customer.phone}`}
                  className="text-blue-600 hover:underline"
                  dir="ltr"
                >
                  {order.customer.phone}
                </a>
              }
              mono
            />
            <DetailRow label="Email" value={order.customer.email} />
            <DetailRow
              label="Customer since"
              value={new Date(order.customer.created_at).toLocaleDateString(
                "en-US",
                { year: "numeric", month: "short", day: "numeric" }
              )}
            />
          </Section>

          {/* Delivery Address */}
          <Section title="Delivery Address" icon="📍">
            <DetailRow
              label="City"
              value={order.address?.zone?.city?.name}
            />
            <DetailRow
              label="Zone (EN)"
              value={order.address?.zone?.english_name}
            />
            <DetailRow
              label="Zone (AR)"
              value={order.address?.zone?.arabic_name}
            />
            <DetailRow
              label="Street details"
              value={order.address?.street_details}
            />
            {/* Copy full address button */}
            {order.address?.street_details && (
              <button
                onClick={() => {
                  const full = [
                    order.customer.full_name,
                    order.customer.phone,
                    order.address?.street_details,
                    order.address?.zone?.arabic_name ||
                      order.address?.zone?.english_name,
                    order.address?.zone?.city?.name,
                  ]
                    .filter(Boolean)
                    .join("، ");
                  navigator.clipboard.writeText(full);
                }}
                className="mt-3 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
                  />
                </svg>
                Copy full address
              </button>
            )}
          </Section>

          {/* Product */}
          <Section title="Product" icon="📦">
            {order.product ? (
              <>
                <div className="flex items-center gap-3 py-2">
                  {order.product.main_image && (
                    <div className="w-14 h-14 relative shrink-0 rounded-lg overflow-hidden border border-gray-200">
                      <Image
                        src={order.product.main_image}
                        alt={order.product.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-gray-900 font-medium text-sm truncate">
                      {order.product.name}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {(order.total_price / (order.quantity || 1)).toFixed(2).replace(/\.00$/, "")} EGP / unit
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <DetailRow label="Quantity" value={order.quantity} />
                  <DetailRow
                    label="Unit price"
                    value={`${(order.total_price / (order.quantity || 1)).toFixed(2).replace(/\.00$/, "")} EGP`}
                  />
                  <DetailRow
                    label="Total"
                    value={
                      <span className="font-bold text-brand-600">
                        {order.total_price} EGP
                      </span>
                    }
                  />
                </div>
              </>
            ) : (
              <DetailRow label="Product" value="No product linked" />
            )}
          </Section>

          {/* Order Info */}
          <Section title="Order Info" icon="🧾">
            <DetailRow
              label="Order ID"
              value={order.id}
              mono
            />
            <DetailRow
              label="Source"
              value={
                <span>
                  {platformIcons[order.platform_source || ""] || ""}{" "}
                  {order.platform_source || "direct"}
                </span>
              }
            />
            <DetailRow
              label="Created"
              value={new Date(order.created_at).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            />
            <DetailRow
              label="Last updated"
              value={new Date(order.updated_at).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            />
          </Section>

          {/* IP / Geolocation */}
          <Section title="Visitor Info" icon="🌐">
            <DetailRow label="IP address" value={order.ip_address} mono />
            <DetailRow label="IP city" value={order.ip_city} />
            <DetailRow label="IP country" value={order.ip_country} />
          </Section>

          {/* Shipping */}
          <Section title="Shipping" icon="🚚">
            <DetailRow
              label="Provider"
              value={
                order.shipping_provider
                  ? order.shipping_provider.charAt(0).toUpperCase() +
                    order.shipping_provider.slice(1)
                  : "—"
              }
            />
            <DetailRow
              label="Tracking ID"
              value={
                order.shipping_tracking_id ? (
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {order.shipping_tracking_id}
                  </span>
                ) : (
                  "—"
                )
              }
            />
          </Section>

          {/* Actions */}
          {state?.availableActions.length > 0 && (
            <div className="pt-2">
              <h4 className="text-gray-900 font-bold text-sm mb-3">Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                {state.availableActions.map((action) => (
                  <button
                    key={action.action}
                    onClick={() => onChangeStatus(order.id, action.nextStatus)}
                    disabled={approvingId === order.id}
                    className={`${action.style} px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 border`}
                  >
                    {approvingId === order.id ? (
                      <svg
                        className="animate-spin w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : null}
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
