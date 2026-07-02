import { supabase } from "@/lib/supabase";
import type { Address, Order, OrderWithDetails } from "@/features/shared/types";

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

  async getPendingOrders(): Promise<OrderWithDetails[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        customer:customers (*),
        address:addresses (
          *,
          zone:zones (
            *,
            city:cities (*)
          )
        ),
        product:products (*)
      `
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending orders:", error);
      return [];
    }
    return (data || []) as unknown as OrderWithDetails[];
  }

  async getAllOrders(): Promise<OrderWithDetails[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        customer:customers (*),
        address:addresses (
          *,
          zone:zones (
            *,
            city:cities (*)
          )
        ),
        product:products (*)
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      return [];
    }
    return (data || []) as unknown as OrderWithDetails[];
  }

  async getOrderById(id: string): Promise<OrderWithDetails | null> {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        customer:customers (*),
        address:addresses (
          *,
          zone:zones (
            *,
            city:cities (*)
          )
        ),
        product:products (*)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching order:", error);
      return null;
    }
    return data as unknown as OrderWithDetails;
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
