export type ShippingProviderName = "bosta" | "abs" | "mylerz" | "test";
export const SHIPPING_PROVIDERS: ShippingProviderName[] = ["bosta", "abs", "mylerz", "test"];

/** Order statuses a provider event can map to (kept as strings to stay decoupled from ordering). */
export type MappedStatus = "pending" | "approved" | "confirmed" | "shipped" | "delivered" | "cancelled" | "returned";

export interface DeliveryInput {
  orderId: string;
  customerName: string;
  customerPhone: string;
  city: string;
  zone: string;
  streetAddress: string;
  cod: number;
  notes?: string;
}

export interface DeliveryResult {
  success: boolean;
  trackingId?: string;
  providerOrderId?: string;
  error?: string;
}

export interface TrackingResult {
  success: boolean;
  status?: string;
  history?: Array<{ state: string; timestamp: string }>;
  error?: string;
}

/** The Strategy every courier implements; chosen by the factory. */
export interface ShippingProvider {
  readonly name: ShippingProviderName;
  createDelivery(input: DeliveryInput): Promise<DeliveryResult>;
  trackDelivery(trackingId: string): Promise<TrackingResult>;
  cancelDelivery(trackingId: string): Promise<{ success: boolean; error?: string }>;
  mapStatus(providerStatus: string): MappedStatus;
  /** Pull tracking id + provider status out of the provider's webhook body. */
  parseWebhook(body: Record<string, unknown>): { trackingId?: string; status?: string };
}

export const isProviderName = (v: unknown): v is ShippingProviderName =>
  typeof v === "string" && (SHIPPING_PROVIDERS as string[]).includes(v);
