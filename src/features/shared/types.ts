// ============================================================
// Shared Types for all features
// ============================================================

// --- Quantity-Tier Pricing ---
/**
 * A quantity-based price tier — "buy X pieces, pay Y per piece".
 * Stored as a JSONB array on the product row (`quantity_prices` column),
 * ordered by `min_quantity` ascending.
 *
 * Example DB column value:
 *   [
 *     { "min_quantity": 1, "price": 299, "compare_at_price": 499, "label": "قطعة واحدة" },
 *     { "min_quantity": 2, "price": 275, "compare_at_price": 499, "label": "قطعتين", "is_special": true },
 *     { "min_quantity": 3, "price": 249, "compare_at_price": 499, "label": "3 قطع", "is_special": true }
 *   ]
 *
 * The landing page renders these as visually distinct price cards;
 * tiers with `is_special: true` get a highlighted "عرض خاص" badge.
 */
export interface QuantityPriceTier {
  /** Minimum quantity to unlock this price (inclusive). */
  min_quantity: number;
  /** Price per unit at this tier. */
  price: number;
  /** Original/crossed-out price per unit for discount display. */
  compare_at_price: number | null;
  /** Arabic label, e.g. "قطعة واحدة", "قطعتين", "3 قطع". */
  label: string;
  /** If true, the tier card gets a "special offer" highlight design. */
  is_special: boolean;
}

// --- Products ---
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  /** Quantity-tiered pricing — JSONB array of QuantityPriceTier. */
  quantity_prices: QuantityPriceTier[] | null;
  sku: string | null;
  qrcode: string | null;
  quantity: number;
  stock_status: "in_stock" | "out_of_stock" | "low_stock";
  main_image: string | null;
  gallery: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Geography ---
export interface Country {
  id: string;
  name: string;
}

export interface City {
  id: string;
  country_id: string;
  name: string;
}

export interface Zone {
  id: string;
  city_id: string;
  english_name: string;
  arabic_name: string;
}

export interface ZoneWithCity extends Zone {
  city: { name: string; country: { name: string } };
}

// --- Customer ---
export interface Customer {
  id: string;
  phone: string;
  email: string | null;
  full_name: string;
  created_at: string;
}

// --- Address ---
export interface Address {
  id: string;
  customer_id: string;
  zone_id: string;
  street_details: string;
  created_at: string;
}

// --- Order ---
export interface Order {
  id: string;
  customer_id: string;
  address_id: string;
  product_id: string | null;
  quantity: number;
  total_price: number;
  platform_source: string | null;
  ip_address: string | null;
  ip_country: string | null;
  ip_city: string | null;
  status: OrderStatus;
  shipping_provider: string | null;
  shipping_tracking_id: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | "pending"
  | "approved"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export interface OrderWithDetails extends Order {
  customer: Customer;
  address: Address & { zone: Zone & { city: City } };
  product: Product | null;
}

// --- Form Data from Landing Page ---
export interface CreateOrderInput {
  full_name: string;
  phone: string;
  email?: string;
  zone_id: string;
  street_details: string;
  product_id?: string;
  quantity?: number;
  platform_source?: string;
  ip_address?: string;
  ip_country?: string;
  ip_city?: string;
}

// --- Shipping ---
export type ShippingProviderName = "bosta" | "abs" | "mylerz";

export interface ShippingDeliveryInput {
  orderId: string;
  customerName: string;
  customerPhone: string;
  city: string;
  zone: string;
  streetAddress: string;
  cod: number;
  notes?: string;
}

export interface ShippingDeliveryResult {
  success: boolean;
  trackingId?: string;
  providerOrderId?: string;
  error?: string;
}

export interface ShippingTrackingResult {
  success: boolean;
  status?: string;
  history?: Array<{ state: string; timestamp: string }>;
  error?: string;
}
