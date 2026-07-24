import { supabase } from "@/lib/supabase";
import type { Customer, CustomerWithStats, CustomerStats, Address, Zone, City, OrderWithDetails } from "@/features/shared/types";

export class CustomerRepository {
  async findByPhone(phone: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", phone)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error finding customer:", error);
    }
    return data || null;
  }

  async create(data: {
    phone: string;
    full_name: string;
    email?: string;
  }): Promise<Customer | null> {
    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        phone: data.phone,
        full_name: data.full_name,
        email: data.email || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating customer:", error);
      return null;
    }
    return customer;
  }

  async getById(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from("customers")
      .select("*, notes")
      .eq("id", id)
      .single();
    if (error) {
      console.error("Error getting customer:", error);
      return null;
    }
    return data;
  }

  async getAllWithStats(
    page: number,
    limit: number,
    search?: string
  ): Promise<{ data: CustomerWithStats[]; totalCount: number }> {
    let query = supabase
      .from("customer_stats")
      .select("*", { count: "exact" });

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    query = query
      .order("last_order_date", { ascending: false, nullsFirst: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error getting customers with stats:", error);
      return { data: [], totalCount: 0 };
    }

    // The customer_stats view exposes the identifier as `customer_id`, not
    // `id` — map it so CustomerWithStats (which extends Customer, requiring
    // `id`) is actually satisfied at runtime, not just at the type level.
    const rows = ((data as any[]) || []).map((r) => ({
      ...r,
      id: r.customer_id,
    })) as CustomerWithStats[];

    return { data: rows, totalCount: count || 0 };
  }

  async getCustomerOrders(id: string): Promise<OrderWithDetails[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(`
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
      `)
      .eq("customer_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error getting customer orders:", error);
      return [];
    }

    return (data as unknown as OrderWithDetails[]) || [];
  }

  async getCustomerStats(id: string): Promise<CustomerStats | null> {
    const { data, error } = await supabase
      .from("customer_stats")
      .select("total_orders, total_spent, avg_order_value, first_order_date, last_order_date")
      .eq("customer_id", id)
      .single();

    if (error) {
      console.error("Error getting customer stats:", error);
      return null;
    }

    return data as CustomerStats;
  }

  async getCustomerAddress(
    id: string
  ): Promise<(Address & { zone: Zone & { city: City } }) | null> {
    const { data, error } = await supabase
      .from("addresses")
      .select(`
        *,
        zone:zones (
          *,
          city:cities (*)
        )
      `)
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error getting customer address:", error);
    }

    return (data as unknown as (Address & { zone: Zone & { city: City } }) | null) || null;
  }

  async update(
    id: string,
    data: Partial<Pick<Customer, "email"> & { notes: string }>
  ): Promise<Customer | null> {
    const { data: customer, error } = await supabase
      .from("customers")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating customer:", error);
      return null;
    }

    return customer;
  }
}

export const customerRepository = new CustomerRepository();
