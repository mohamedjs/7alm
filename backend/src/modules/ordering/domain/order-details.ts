import type { OrderStatus } from "./order-status";
import type { ProductDto } from "../../catalog";

/** Read model returned by every order endpoint — v1 `OrderWithDetails` shape. */
export interface OrderItemDto {
  id: string;
  order_id: string;
  product_id: string | null;
  product?: ProductDto;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface OrderDetailsDto {
  id: string;
  customer_id: string;
  address_id: string;
  product_id: string | null;
  quantity: number;
  total_price: number;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  coupon_code: string | null;
  platform_source: string | null;
  ip_address: string | null;
  ip_country: string | null;
  ip_city: string | null;
  status: OrderStatus;
  shipping_provider: string | null;
  shipping_tracking_id: string | null;
  requires_confirmation: boolean;
  last_notified_status: string | null;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
  customer: { id: string; phone: string; email: string | null; full_name: string; created_at: string };
  address: {
    id: string;
    customer_id: string;
    zone_id: string;
    street_details: string;
    created_at: string;
    zone: { id: string; city_id: string; english_name: string; arabic_name: string; shipping_price: number; city: { id: string; country_id: string; name: string } };
  };
  product: ProductDto | null;
  items: OrderItemDto[];
}

export const ORDER_READS = Symbol("ORDER_READS");
export interface OrderReads {
  details(id: string): Promise<OrderDetailsDto | null>;
  list(filter: { status?: OrderStatus; customerId?: string; limit?: number }): Promise<OrderDetailsDto[]>;
  latestApprovedForPhone(phone: string): Promise<OrderDetailsDto | null>;
}
