export interface CustomerDto {
  id: string;
  phone: string;
  email: string | null;
  full_name: string;
  notes: string | null;
  created_at: string;
}

export interface CustomerStatsDto {
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  first_order_date: string | null;
  last_order_date: string | null;
}

export type CustomerWithStats = CustomerDto & CustomerStatsDto;

export interface AddressDto {
  id: string;
  customer_id: string;
  zone_id: string;
  street_details: string;
  created_at: string;
}

export const CUSTOMER_STORE = Symbol("CUSTOMER_STORE");
export interface CustomerStore {
  findByPhone(phone: string, tx?: unknown): Promise<CustomerDto | null>;
  findById(id: string): Promise<CustomerDto | null>;
  create(input: { phone: string; full_name: string; email?: string | null }, tx?: unknown): Promise<CustomerDto>;
  update(id: string, input: { email?: string | null; notes?: string | null; full_name?: string }): Promise<CustomerDto>;
  createAddress(customerId: string, zoneId: string, street: string, tx?: unknown): Promise<AddressDto>;
  listWithStats(page: number, limit: number, search?: string): Promise<{ data: CustomerWithStats[]; totalCount: number }>;
  stats(id: string): Promise<CustomerStatsDto | null>;
  analytics(sinceDays: number): Promise<{ totalCustomers: number; newCustomers: number; repeatRate: number; topCustomers: { full_name: string; total_spent: number }[] }>;
}
