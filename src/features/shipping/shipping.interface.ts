import type {
  ShippingDeliveryInput,
  ShippingDeliveryResult,
  ShippingTrackingResult,
} from "@/features/shared/types";

/**
 * Abstract Shipping Provider Interface.
 * All logistics providers (Bosta, ABS, Mylerz) must implement this contract.
 */
export interface IShippingProvider {
  /** Unique provider identifier */
  readonly name: string;

  /** Create a delivery/shipment with the provider */
  createDelivery(input: ShippingDeliveryInput): Promise<ShippingDeliveryResult>;

  /** Track a delivery by its tracking ID */
  trackDelivery(trackingId: string): Promise<ShippingTrackingResult>;

  /** Cancel a delivery (if supported) */
  cancelDelivery(
    trackingId: string
  ): Promise<{ success: boolean; error?: string }>;

  /** Map provider-specific status to our internal status */
  mapStatus(
    providerStatus: string
  ): "pending" | "approved" | "confirmed" | "shipped" | "delivered" | "cancelled" | "returned";
}
