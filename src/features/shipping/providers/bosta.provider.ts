import type { IShippingProvider } from "../shipping.interface";
import type {
  ShippingDeliveryInput,
  ShippingDeliveryResult,
  ShippingTrackingResult,
} from "@/features/shared/types";

/**
 * Bosta Shipping Provider Implementation
 * Docs: https://docs.bosta.co
 * SDK: https://github.com/bostaapp/bosta-nodejs (we use REST directly)
 *
 * Base URLs:
 * - Staging: https://stg-app.bosta.co/api/v2
 * - Production: https://app.bosta.co/api/v2
 */
export class BostaProvider implements IShippingProvider {
  readonly name = "bosta";
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.BOSTA_API_KEY || "";
    this.baseUrl =
      process.env.BOSTA_BASE_URL || "https://app.bosta.co/api/v2";
  }

  async createDelivery(
    input: ShippingDeliveryInput
  ): Promise<ShippingDeliveryResult> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error:
            "BOSTA_API_KEY is not configured. Set it in .env.local to enable Bosta shipping.",
        };
      }

      // Split customer name into first/last
      const nameParts = input.customerName.trim().split(" ");
      const firstName = nameParts[0] || "Customer";
      const lastName = nameParts.slice(1).join(" ") || "N/A";

      const payload = {
        type: 10, // DELIVER type
        specs: {
          packageDetails: {
            itemsCount: 1,
          },
        },
        cod: input.cod,
        dropOffAddress: {
          city: input.city,
          zone: input.zone,
          firstLine: input.streetAddress,
          secondLine: "",
        },
        receiver: {
          firstName,
          lastName,
          phone: input.customerPhone,
        },
        businessReference: input.orderId,
        notes: input.notes || "",
      };

      const response = await fetch(`${this.baseUrl}/deliveries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `Bosta API error: ${response.status}`,
        };
      }

      return {
        success: true,
        trackingId: data.trackingNumber || data._id,
        providerOrderId: data._id,
      };
    } catch (err) {
      console.error("Bosta createDelivery error:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  async trackDelivery(trackingId: string): Promise<ShippingTrackingResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/deliveries/track/${trackingId}`,
        {
          headers: {
            Authorization: this.apiKey,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Failed to track delivery",
        };
      }

      return {
        success: true,
        status: data.CurrentStatus?.state || "unknown",
        history: (data.TransitEvents || []).map(
          (event: { state: string; timestamp: string }) => ({
            state: event.state,
            timestamp: event.timestamp,
          })
        ),
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  async cancelDelivery(
    deliveryId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/deliveries/${deliveryId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: this.apiKey,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: data.message || "Failed to cancel delivery",
        };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Map Bosta delivery states to our internal order statuses
   */
  mapStatus(
    bostaStatus: string
  ): "pending" | "approved" | "shipped" | "delivered" | "cancelled" | "returned" {
    const statusMap: Record<string, "pending" | "approved" | "shipped" | "delivered" | "cancelled" | "returned"> = {
      TICKET_CREATED: "approved",
      PACKAGE_RECEIVED: "shipped",
      IN_TRANSIT: "shipped",
      NOT_YET_SHIPPED: "approved",
      OUT_FOR_DELIVERY: "shipped",
      DELIVERED: "delivered",
      WAITING_FOR_CUSTOMER_ACTION: "shipped",
      RECEIVED_AT_WAREHOUSE: "shipped",
      EXCEPTION: "shipped",
      TERMINATED: "cancelled",
      CANCELED: "cancelled",
      RETURNED_TO_BUSINESS: "returned",
    };

    return statusMap[bostaStatus] || "pending";
  }
}
