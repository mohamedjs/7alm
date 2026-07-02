import { supabase } from "@/lib/supabase";
import type { Customer } from "@/features/shared/types";

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
}

export const customerRepository = new CustomerRepository();
