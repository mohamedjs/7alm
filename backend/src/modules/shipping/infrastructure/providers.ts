import { Logger } from "@nestjs/common";
import type { Env } from "../../../shared/infrastructure/config/env";
import type { DeliveryInput, DeliveryResult, MappedStatus, ShippingProvider, TrackingResult } from "../domain/shipping";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Unknown error");

export class BostaProvider implements ShippingProvider {
  readonly name = "bosta" as const;
  constructor(private readonly env: Env) {}

  async createDelivery(input: DeliveryInput): Promise<DeliveryResult> {
    if (!this.env.BOSTA_API_KEY) return { success: false, error: "BOSTA_API_KEY is not configured." };
    const [firstName = "Customer", ...rest] = input.customerName.trim().split(/\s+/);
    try {
      const res = await fetch(`${this.env.BOSTA_BASE_URL}/deliveries`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: this.env.BOSTA_API_KEY },
        body: JSON.stringify({
          type: 10,
          specs: { packageDetails: { itemsCount: 1 } },
          cod: input.cod,
          dropOffAddress: { city: input.city, zone: input.zone, firstLine: input.streetAddress, secondLine: "" },
          receiver: { firstName, lastName: rest.join(" ") || "N/A", phone: input.customerPhone },
          businessReference: input.orderId,
          notes: input.notes ?? "",
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) return { success: false, error: (data.message as string) || `Bosta API error: ${res.status}` };
      const body = (data.data as Record<string, unknown>) ?? data;
      return { success: true, trackingId: String(body.trackingNumber ?? body._id ?? ""), providerOrderId: String(body._id ?? "") };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  }

  async trackDelivery(trackingId: string): Promise<TrackingResult> {
    try {
      const res = await fetch(`${this.env.BOSTA_BASE_URL}/deliveries/track/${encodeURIComponent(trackingId)}`, {
        headers: { Authorization: this.env.BOSTA_API_KEY ?? "" },
        signal: AbortSignal.timeout(15_000),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!res.ok) return { success: false, error: data.message || "Failed to track delivery" };
      return {
        success: true,
        status: data.CurrentStatus?.state || "unknown",
        history: (data.TransitEvents || []).map((e: { state: string; timestamp: string }) => ({ state: e.state, timestamp: e.timestamp })),
      };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  }

  async cancelDelivery(id: string) {
    try {
      const res = await fetch(`${this.env.BOSTA_BASE_URL}/deliveries/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: this.env.BOSTA_API_KEY ?? "" },
        signal: AbortSignal.timeout(15_000),
      });
      return res.ok ? { success: true } : { success: false, error: `Bosta cancel failed: ${res.status}` };
    } catch (e) {
      return { success: false, error: errMsg(e) };
    }
  }

  mapStatus(s: string): MappedStatus {
    const map: Record<string, MappedStatus> = {
      TICKET_CREATED: "approved",
      NOT_YET_SHIPPED: "approved",
      PACKAGE_RECEIVED: "shipped",
      IN_TRANSIT: "shipped",
      OUT_FOR_DELIVERY: "shipped",
      WAITING_FOR_CUSTOMER_ACTION: "shipped",
      RECEIVED_AT_WAREHOUSE: "shipped",
      EXCEPTION: "shipped",
      DELIVERED: "delivered",
      TERMINATED: "cancelled",
      CANCELED: "cancelled",
      RETURNED_TO_BUSINESS: "returned",
    };
    return map[s] ?? "pending";
  }

  parseWebhook(body: Record<string, any>) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return {
      trackingId: body.trackingNumber ?? body.TrackingNumber,
      status: body.CurrentStatus?.state ?? body.currentStatus?.state ?? body.state,
    };
  }
}

/** Placeholder couriers: they refuse to create a delivery until credentials and an integration exist. */
class NotConfiguredProvider implements ShippingProvider {
  constructor(
    readonly name: "abs" | "mylerz",
    private readonly fields: { tracking: string; status: string },
  ) {}
  async createDelivery(): Promise<DeliveryResult> {
    return { success: false, error: `${this.name.toUpperCase()} provider is not configured yet.` };
  }
  async trackDelivery(): Promise<TrackingResult> {
    return { success: false, error: `${this.name.toUpperCase()} tracking not implemented` };
  }
  async cancelDelivery() {
    return { success: false, error: `${this.name.toUpperCase()} cancel not implemented` };
  }
  mapStatus(s: string): MappedStatus {
    const map: Record<string, MappedStatus> = { delivered: "delivered", in_transit: "shipped", shipped: "shipped", cancelled: "cancelled", returned: "returned" };
    return map[s?.toLowerCase()] ?? "pending";
  }
  parseWebhook(body: Record<string, unknown>) {
    return { trackingId: body[this.fields.tracking] as string | undefined, status: body[this.fields.status] as string | undefined };
  }
}

export const absProvider = () => new NotConfiguredProvider("abs", { tracking: "tracking_id", status: "status" });
export const mylerzProvider = () => new NotConfiguredProvider("mylerz", { tracking: "tracking_number", status: "order_status" });

/**
 * Simulated courier for demos and end-to-end tests: after creating a
 * delivery it calls our own shipping webhook with picked_up → in_transit →
 * delivered, spaced by TEST_SHIPPING_DELAY_MS.
 */
export class TestProvider implements ShippingProvider {
  readonly name = "test" as const;
  private readonly log = new Logger("TestShipping");
  private get delayMs() {
    return this.env.TEST_SHIPPING_DELAY_MS;
  }

  constructor(private readonly env: Env) {}

  async createDelivery(input: DeliveryInput): Promise<DeliveryResult> {
    const trackingId = `TEST-${Date.now()}-${input.orderId.slice(0, 8)}`;
    this.simulate(trackingId);
    return { success: true, trackingId, providerOrderId: `TEST-ORDER-${input.orderId.slice(0, 8)}` };
  }

  private simulate(trackingId: string) {
    const secret = this.env.SHIPPING_WEBHOOK_SECRET;
    if (!secret) {
      this.log.warn("SHIPPING_WEBHOOK_SECRET unset — test delivery will not progress");
      return;
    }
    const base = this.env.SHIPPING_TEST_WEBHOOK_BASE ?? `http://127.0.0.1:${this.env.PORT}`;
    const url = `${base}/api/webhooks/shipping?provider=test&secret=${encodeURIComponent(secret)}`;
    ["picked_up", "in_transit", "delivered"].forEach((status, i) => {
      setTimeout(() => {
        fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trackingId, status }) }).catch((e) =>
          this.log.warn(`simulated webhook failed: ${errMsg(e)}`),
        );
      }, this.delayMs * (i + 1)).unref();
    });
  }

  async trackDelivery(): Promise<TrackingResult> {
    return { success: true, status: "in_transit", history: [{ state: "in_transit", timestamp: new Date().toISOString() }] };
  }
  async cancelDelivery() {
    return { success: true };
  }
  mapStatus(s: string): MappedStatus {
    const map: Record<string, MappedStatus> = {
      created: "confirmed",
      picked_up: "shipped",
      in_transit: "shipped",
      out_for_delivery: "shipped",
      delivered: "delivered",
      cancelled: "cancelled",
      returned: "returned",
    };
    return map[s] ?? "pending";
  }
  parseWebhook(body: Record<string, unknown>) {
    return { trackingId: body.trackingId as string | undefined, status: body.status as string | undefined };
  }
}
