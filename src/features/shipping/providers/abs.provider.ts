import type { IShippingProvider } from "../shipping.interface";
import type {
  ShippingDeliveryInput,
  ShippingDeliveryResult,
  ShippingTrackingResult,
} from "@/features/shared/types";

/**
 * ABS (Arabian Business Solutions) Shipping Provider - Placeholder Implementation
 *
 * TODO: Replace with actual ABS API integration when credentials are available.
 * ABS is a popular Egyptian logistics company.
 *
 * Expected API pattern:
 * - Base URL: https://api.abs.com.eg/v1
 * - Auth: Bearer token
 * - Create Shipment: POST /shipments
 * - Track: GET /shipments/{trackingNumber}/track
 */
export class AbsProvider implements IShippingProvider {
  readonly name = "abs";

  async createDelivery(
    input: ShippingDeliveryInput
  ): Promise<ShippingDeliveryResult> {
    // TODO: Implement actual ABS API call
    console.log("ABS createDelivery called with:", input);
    return {
      success: false,
      error:
        "ABS provider is not yet configured. Please add ABS API credentials to .env.local and implement the integration.",
    };
  }

  async trackDelivery(trackingId: string): Promise<ShippingTrackingResult> {
    console.log("ABS trackDelivery called with:", trackingId);
    return {
      success: false,
      error: "ABS tracking not yet implemented",
    };
  }

  async cancelDelivery(
    trackingId: string
  ): Promise<{ success: boolean; error?: string }> {
    console.log("ABS cancelDelivery called with:", trackingId);
    return { success: false, error: "ABS cancellation not yet implemented" };
  }

  mapStatus(
    providerStatus: string
  ): "pending" | "approved" | "shipped" | "delivered" | "cancelled" | "returned" {
    // TODO: Map ABS-specific statuses
    const statusMap: Record<string, "pending" | "approved" | "shipped" | "delivered" | "cancelled" | "returned"> = {
      created: "approved",
      picked_up: "shipped",
      in_transit: "shipped",
      out_for_delivery: "shipped",
      delivered: "delivered",
      cancelled: "cancelled",
      returned: "returned",
    };
    return statusMap[providerStatus] || "pending";
  }
}
