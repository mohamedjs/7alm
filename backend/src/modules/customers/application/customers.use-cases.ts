import { Inject, Injectable } from "@nestjs/common";
import { DomainError } from "../../../shared/domain/domain-error";
import { CUSTOMER_STORE, type CustomerStore } from "../domain/customer";

/** Exported to ordering, reviews, messaging: identity of a buyer by phone. */
@Injectable()
export class CustomersFacade {
  constructor(@Inject(CUSTOMER_STORE) private readonly store: CustomerStore) {}

  /** A phone number identifies a customer; the first name given wins. */
  async findOrCreate(phone: string, fullName: string, email?: string, tx?: unknown) {
    return (await this.store.findByPhone(phone, tx)) ?? this.store.create({ phone, full_name: fullName, email }, tx);
  }

  findByPhone(phone: string, tx?: unknown) {
    return this.store.findByPhone(phone, tx);
  }

  findById(id: string) {
    return this.store.findById(id);
  }

  addAddress(customerId: string, zoneId: string, street: string, tx?: unknown) {
    return this.store.createAddress(customerId, zoneId, street, tx);
  }
}

@Injectable()
export class CustomersAdmin {
  constructor(@Inject(CUSTOMER_STORE) private readonly store: CustomerStore) {}

  async list(page: number, limit: number, search?: string) {
    const safePage = Math.max(1, page || 1);
    const safeLimit = Math.min(Math.max(1, limit || 20), 100);
    const result = await this.store.listWithStats(safePage, safeLimit, search?.trim() || undefined);
    return { ...result, page: safePage, limit: safeLimit };
  }

  async get(id: string) {
    const customer = await this.store.findById(id);
    if (!customer) throw DomainError.notFound("Customer not found");
    const stats = (await this.store.stats(id)) ?? {
      total_orders: 0,
      total_spent: 0,
      avg_order_value: 0,
      first_order_date: null,
      last_order_date: null,
    };
    return { customer, stats };
  }

  update(id: string, input: { email?: string | null; notes?: string | null }) {
    return this.store.update(id, input);
  }

  analytics(days = 30) {
    return this.store.analytics(days);
  }
}
