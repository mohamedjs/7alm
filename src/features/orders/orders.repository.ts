import { supabase } from "@/lib/supabase";
import type { Address, Order, OrderItem, OrderWithDetails } from "@/features/shared/types";

/**
 * Shared select string for every order read — additive over the original
 * (pre-007) shape: adds the `order_items` embed (each with its own nested
 * `product`) alongside the legacy `product:products (*)` embed. Neither
 * embed depends on the other; the read-fallback lives in `mapOrderItems`.
 */
const ORDER_SELECT = `
  *,
  customer:customers (*),
  address:addresses (
    *,
    zone:zones (
      *,
      city:cities (*)
    )
  ),
  product:products (*),
  order_items (
    *,
    product:products (*)
  )
`;

/**
 * `OrderWithDetails.items` read-fallback rule: `order_items` rows when
 * present (multi-item cart order), else a single-entry array synthesized
 * from the legacy `product_id`/`quantity`/`total_price` columns
 * (single-product funnel order) — exactly what every existing reader
 * (`OrdersTable`, `OrderDetailsDrawer`, n8n) already renders today.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOrderItems(raw: any): OrderItem[] {
  const rows = raw.order_items as
    | Array<{
        id: string;
        order_id: string;
        product_id: string | null;
        product?: unknown;
        quantity: number;
        unit_price: number;
        total_price: number;
        created_at: string;
      }>
    | null
    | undefined;

  if (rows && rows.length > 0) {
    return rows.map((row) => ({
      id: row.id,
      order_id: row.order_id,
      product_id: row.product_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      product: (row.product as any) ?? undefined,
      quantity: row.quantity,
      unit_price: row.unit_price,
      total_price: row.total_price,
      created_at: row.created_at,
    }));
  }

  if (raw.product_id) {
    return [
      {
        id: raw.id,
        order_id: raw.id,
        product_id: raw.product_id,
        product: raw.product ?? undefined,
        quantity: raw.quantity,
        unit_price: raw.product?.price ?? raw.total_price,
        total_price: raw.total_price,
        created_at: raw.created_at,
      },
    ];
  }

  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toOrderWithDetails(raw: any): OrderWithDetails {
  return { ...raw, items: mapOrderItems(raw) } as OrderWithDetails;
}

export class OrderRepository {
  async createAddress(
    customerId: string,
    zoneId: string,
    streetDetails: string
  ): Promise<Address | null> {
    const { data, error } = await supabase
      .from("addresses")
      .insert({
        customer_id: customerId,
        zone_id: zoneId,
        street_details: streetDetails,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating address:", error);
      return null;
    }
    return data;
  }

  async createOrder(data: {
    customer_id: string;
    address_id: string;
    product_id?: string;
    quantity?: number;
    total_price?: number;
    platform_source?: string;
    ip_address?: string;
    ip_country?: string;
    ip_city?: string;
  }): Promise<Order | null> {
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_id: data.customer_id,
        address_id: data.address_id,
        product_id: data.product_id || null,
        quantity: data.quantity || 1,
        total_price: data.total_price || 0,
        platform_source: data.platform_source || null,
        ip_address: data.ip_address || null,
        ip_country: data.ip_country || null,
        ip_city: data.ip_city || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating order:", error);
      return null;
    }
    return order;
  }

  /**
   * Insert the line-item breakdown for a multi-item cart order. Never
   * called for the legacy single-product funnel path.
   */
  async createOrderItems(
    orderId: string,
    items: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>
  ): Promise<OrderItem[] | null> {
    if (items.length === 0) return [];

    const { data, error } = await supabase
      .from("order_items")
      .insert(
        items.map((item) => ({
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }))
      )
      .select();

    if (error) {
      console.error("Error creating order items:", error);
      return null;
    }
    return data;
  }

  async getPendingOrders(): Promise<OrderWithDetails[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending orders:", error);
      return [];
    }
    return (data || []).map(toOrderWithDetails);
  }

  async getAllOrders(): Promise<OrderWithDetails[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      return [];
    }
    return (data || []).map(toOrderWithDetails);
  }

  async getOrderById(id: string): Promise<OrderWithDetails | null> {
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching order:", error);
      return null;
    }
    return toOrderWithDetails(data);
  }

  /**
   * Latest order still awaiting the customer's WhatsApp confirmation
   * (status = 'approved'), looked up by the customer's phone number.
   */
  async getLatestApprovedOrderByPhone(
    phone: string
  ): Promise<OrderWithDetails | null> {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", phone)
      .single();

    if (customerError || !customer) return null;

    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("customer_id", customer.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return toOrderWithDetails(data);
  }

  async updateOrderStatus(
    id: string,
    status: string,
    shippingProvider?: string,
    shippingTrackingId?: string
  ): Promise<Order | null> {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (shippingProvider) updateData.shipping_provider = shippingProvider;
    if (shippingTrackingId)
      updateData.shipping_tracking_id = shippingTrackingId;

    const { data, error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating order:", error);
      return null;
    }
    return data;
  }
}

export const orderRepository = new OrderRepository();
