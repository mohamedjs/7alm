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

// --- Categories ---
export interface Category {
  id: string;
  parent_id: string | null;
  slug: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  sort_order: number;
  image: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryTree extends Category {
  subcategories: CategoryTree[];
}

// --- Products ---
export interface Product {
  id: string;
  category_id: string | null;
  category?: Category;
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
  /** Hex color (e.g. "#06b6d4") — drives the Lookbook hero glow/CTA accent for this product. */
  theme_color: string;
  /** Hero-eligible on the store homepage's featured thumbnail row. */
  is_featured: boolean;
  /** Admin-settable sort order for the Lookbook hero. */
  featured_sort: number | null;
  created_at: string;
  updated_at: string;
}

export interface ActiveProductDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  main_image: string | null;
  availability: {
    status: Product["stock_status"];
    available_quantity: number;
    can_order: boolean;
  };
  pricing: {
    currency: "EGP";
    unit_price: number;
    compare_at_price: number | null;
    discount_percentage: number;
  };
  quantity_offers: Array<{
    min_quantity: number;
    label: string;
    unit_price: number;
    compare_at_price: number | null;
    is_special: boolean;
  }>;
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
  shipping_price: number;
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
  shipping_cost: number;
  status: OrderStatus;
  shipping_provider: string | null;
  shipping_tracking_id: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | "pending"
  | "approved"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

// --- Order Items (additive line-item annex for multi-product cart orders) ---
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product?: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface OrderWithDetails extends Order {
  customer: Customer;
  address: Address & { zone: Zone & { city: City } };
  product: Product | null;
  /** Always populated: order_items rows when present, else a single-entry array synthesized from product_id/quantity (legacy funnel orders). */
  items: OrderItem[];
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
  /** Multi-item cart checkout — when present, the order is created with order_items rows instead of the legacy product_id/quantity path. */
  items?: Array<{ product_id: string; quantity: number }>;
  platform_source?: string;
  ip_address?: string;
  ip_country?: string;
  ip_city?: string;
}

// --- Shipping ---
export type ShippingProviderName = "bosta" | "abs" | "mylerz" | "test";

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

// --- n8n Integration ---
/**
 * Payload sent to the n8n webhook when an order status changes.
 * Used by OrderService.notifyN8n() to trigger WhatsApp notifications.
 */
export interface N8nOrderNotification {
  orderId: string;
  newStatus: string;
  customerPhone: string;
  customerName: string;
  productName: string;
  trackingId: string | null;
  totalPrice: number;
  quantity: number;
  /** Always populated — one element for a legacy single-product funnel order, N elements for a cart order. */
  items: Array<{ productName: string; quantity: number; unitPrice: number; totalPrice: number }>;
}

/**
 * Payload received from n8n when a user responds to a WhatsApp
 * order confirmation message (accept/cancel button press).
 */
export interface WhatsAppOrderAction {
  orderId: string;
  action: "confirm" | "cancel";
}

// --- Testimonials ---
export interface Testimonial {
  id: string;
  name_ar: string;
  name_en: string | null;
  role_ar: string | null;
  role_en: string | null;
  text_ar: string;
  text_en: string | null;
  rating: number;
  is_active: boolean;
  created_at: string;
}


// --- WhatsApp Messaging ---
export type WhatsAppMessageDirection = "inbound" | "outbound";

export type WhatsAppMessageStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export interface WhatsAppMessage {
  id: string;
  customer_id: string;
  admin_id: string | null;
  direction: WhatsAppMessageDirection;
  body: string;
  media_url: string | null;
  media_type: string | null;
  status: WhatsAppMessageStatus;
  evolution_message_id: string | null;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessageInput {
  customer_id: string;
  admin_id?: string | null;
  direction: WhatsAppMessageDirection;
  body: string;
  media_url?: string | null;
  media_type?: string | null;
  status: WhatsAppMessageStatus;
  evolution_message_id?: string | null;
  phone: string;
}

// --- CRM ---
export interface CustomerStats {
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  first_order_date: string | null;
  last_order_date: string | null;
}

export interface CustomerWithStats extends Customer {
  notes: string | null;
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  first_order_date: string | null;
  last_order_date: string | null;
}

export interface CustomerDetail {
  customer: Customer & { notes: string | null };
  stats: CustomerStats;
  orders: OrderWithDetails[];
  address: (Address & { zone: Zone & { city: City } }) | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
}

export interface InboundWebhookPayload {
  phone: string;
  body: string;
  evolutionMessageId: string;
  mediaUrl?: string;
  mediaType?: string;
}

export interface StatusWebhookPayload {
  evolutionMessageId: string;
  status: WhatsAppMessageStatus;
}

export interface CustomerAnalytics {
  totalCustomers: number;
  newCustomers: number;
  repeatRate: number;
  topCustomers: { full_name: string; total_spent: number }[];
}

// --- n8n WhatsApp Send ---
export interface N8nSendRequest {
  phone: string;
  body: string;
}

export interface N8nSendResponse {
  messageId: string;
  status: string;
}

// --- Social Platform Connections (OAuth "connect accounts" foundation) ---
/**
 * Supported social platforms for the admin "connect accounts" feature.
 * WhatsApp here refers to the official WhatsApp Cloud API (Meta) OAuth —
 * a separate connection from the existing Evolution/n8n WhatsApp integration.
 */
export type SocialPlatform = "facebook" | "instagram" | "tiktok" | "whatsapp";

export type SocialConnectionStatus =
  | "disconnected"
  | "connected"
  | "expired"
  | "revoked"
  | "error";

/** Result of exchanging an OAuth code for tokens. */
export interface SocialTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scopes?: string[];
}

/** Provider account info fetched right after a successful token exchange. */
export interface SocialAccountInfo {
  accountId: string;
  accountName: string;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Full `social_connections` row (server only — includes encrypted tokens).
 * Never send this shape to the client; use SocialConnectionPublic instead.
 */
export interface SocialConnection {
  id: string;
  platform: SocialPlatform;
  account_id: string | null;
  account_name: string | null;
  avatar_url: string | null;
  access_token: string | null;
  refresh_token: string | null;
  scopes: string[];
  status: SocialConnectionStatus;
  error_message: string | null;
  metadata: Record<string, unknown>;
  connected_by: string | null;
  connected_at: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Safe shape returned to the client — NO tokens. */
export interface SocialConnectionPublic {
  platform: SocialPlatform;
  status: SocialConnectionStatus;
  account_name: string | null;
  avatar_url: string | null;
  scopes: string[];
  connected_at: string | null;
  is_configured: boolean;
}
