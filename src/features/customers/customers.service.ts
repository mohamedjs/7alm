import { customerRepository } from "./customers.repository";
import type { Customer, CustomerWithStats, CustomerDetail, CustomerStats, PaginatedResponse } from "@/features/shared/types";

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

  async getCustomerList(
    page: number,
    limit: number,
    search?: string
  ): Promise<PaginatedResponse<CustomerWithStats>> {
    const result = await customerRepository.getAllWithStats(page, limit, search);
    return {
      data: result.data,
      totalCount: result.totalCount,
      page,
      limit,
    };
  }

  async getCustomerDetail(id: string): Promise<CustomerDetail> {
    const customer = await customerRepository.getById(id);
    if (!customer) {
      throw new Error("Customer not found");
    }

    const [stats, orders, address] = await Promise.all([
      customerRepository.getCustomerStats(id),
      customerRepository.getCustomerOrders(id),
      customerRepository.getCustomerAddress(id),
    ]);

    return {
      customer: customer as Customer & { notes: string | null },
      stats: stats || {
        total_orders: 0,
        total_spent: 0,
        avg_order_value: 0,
        first_order_date: null,
        last_order_date: null,
      },
      orders,
      address,
    };
  }

  async updateCustomer(
    id: string,
    data: Partial<Pick<Customer, "email"> & { notes: string }>
  ): Promise<Customer> {
    const customer = await customerRepository.update(id, data);
    if (!customer) {
      throw new Error("Failed to update customer");
    }
    return customer;
  }

  /**
   * Look up a customer by phone without creating one — used by
   * customer-independent read paths (e.g. coupon preview) that must
   * never create a customer row as a side effect.
   */
  async findByPhone(phone: string): Promise<Customer | null> {
    return customerRepository.findByPhone(phone);
  }
}

export const customerService = new CustomerService();
