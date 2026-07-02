import { customerRepository } from "./customers.repository";
import type { Customer } from "@/features/shared/types";

export class CustomerService {
  /**
   * Find an existing customer by phone, or create a new one.
   */
  async findOrCreate(
    phone: string,
    fullName: string,
    email?: string
  ): Promise<Customer | null> {
    // Try to find existing customer
    const existing = await customerRepository.findByPhone(phone);
    if (existing) {
      return existing;
    }

    // Create new customer
    return customerRepository.create({ phone, full_name: fullName, email });
  }
}

export const customerService = new CustomerService();
