import type { IShippingProvider } from "../shipping.interface";
import type {
  ShippingDeliveryInput,
  ShippingDeliveryResult,
  ShippingTrackingResult,
} from "@/features/shared/types";

/**
 * Test Shipping Provider — Simulated delivery for development/testing.
 *
 * Behavior:
 * - `createDelivery()`: Returns a mock tracking ID immediately,
 *   then asynchronously simulates status progression by calling
 *   our own `/api/webhooks/shipping?provider=test` endpoint.
 *
 * Simulation timeline (configurable via TEST_SHIPPING_DELAY_MS env):
 * - T+0s:   Returns tracking ID (status = approved/confirmed)
 * - T+30s:  Webhook call → status = "picked_up" → maps to "shipped"
 * - T+60s:  Webhook call → status = "delivered" → maps to "delivered"
 */
export class TestProvider implements IShippingProvider {
  readonly name = "test";
  private delayMs: number;
  private baseUrl: string;

  constructor() {
    this.delayMs = parseInt(process.env.TEST_SHIPPING_DELAY_MS || "30000", 10);
    // Use the app's own base URL to call the shipping webhook
    this.baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";
  }

  async createDelivery(
    input: ShippingDeliveryInput
  ): Promise<ShippingDeliveryResult> {
    const trackingId = `TEST-${Date.now()}-${input.orderId.substring(0, 8)}`;

    console.log(
      `[TestProvider] Creating simulated delivery for order ${input.orderId}`
    );
    console.log(
      `[TestProvider] Tracking ID: ${trackingId}, delay: ${this.delayMs}ms`
    );

    // Fire-and-forget: simulate status progression asynchronously
    this.simulateDelivery(trackingId);

    return {
      success: true,
      trackingId,
      providerOrderId: `TEST-ORDER-${input.orderId.substring(0, 8)}`,
    };
  }

  async trackDelivery(trackingId: string): Promise<ShippingTrackingResult> {
    console.log(`[TestProvider] Tracking delivery: ${trackingId}`);
    return {
      success: true,
      status: "in_transit",
      history: [
        {
          state: "picked_up",
          timestamp: new Date(Date.now() - this.delayMs).toISOString(),
        },
        {
          state: "in_transit",
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  async cancelDelivery(
    trackingId: string
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`[TestProvider] Cancelling delivery: ${trackingId}`);
    return { success: true };
  }

  mapStatus(
    providerStatus: string
  ):
    | "pending"
    | "approved"
    | "confirmed"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "returned" {
    const statusMap: Record<
      string,
      | "pending"
      | "approved"
      | "confirmed"
      | "shipped"
      | "delivered"
      | "cancelled"
      | "returned"
    > = {
      created: "confirmed",
      picked_up: "shipped",
      in_transit: "shipped",
      out_for_delivery: "shipped",
      delivered: "delivered",
      cancelled: "cancelled",
      returned: "returned",
    };
    return statusMap[providerStatus] || "pending";
  }

  /**
   * Asynchronously simulates a delivery progression by calling
   * our own shipping webhook endpoint after timed delays.
   */
  private simulateDelivery(trackingId: string): void {
    const webhookSecret = process.env.SHIPPING_WEBHOOK_SECRET || "";
    const webhookUrl = `${this.baseUrl}/api/webhooks/shipping?provider=test&secret=${encodeURIComponent(webhookSecret)}`;

    const sendStatusUpdate = (status: string, delay: number) => {
      setTimeout(async () => {
        try {
          console.log(
            `[TestProvider] Simulating status "${status}" for ${trackingId}`
          );
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              trackingId,
              status,
            }),
          });
          if (!response.ok) {
            console.error(
              `[TestProvider] Webhook call failed for status "${status}":`,
              response.status
            );
          }
        } catch (err) {
          console.error(
            `[TestProvider] Webhook call error for status "${status}":`,
            err
          );
        }
      }, delay);
    };

    // Simulate: picked_up after 1x delay, delivered after 2x delay
    sendStatusUpdate("picked_up", this.delayMs);
    sendStatusUpdate("delivered", this.delayMs * 2);
  }
}
