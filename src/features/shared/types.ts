// ============================================================
// Shared Types for all features
// ============================================================

// --- Products ---
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
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
