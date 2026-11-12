import { Inject, Injectable, Logger } from "@nestjs/common";
import { REALTIME, type Realtime } from "../../../shared/application/realtime.port";
import { DomainError } from "../../../shared/domain/domain-error";
import { toLocalEgyptPhone } from "../../../shared/domain/phone";
import { CustomersAdmin, CustomersFacade } from "../../customers";
import { OrderQueries } from "../../ordering";
import { EvolutionWhatsApp } from "../infrastructure/evolution-whatsapp";

/**
 * Composition layer for the CRM screens: customers + their orders + their
 * WhatsApp history. It depends on customers and ordering; neither depends on it.
 */
@Injectable()
export class CrmUseCases {
  private readonly log = new Logger(CrmUseCases.name);

  constructor(
    private readonly customers: CustomersAdmin,
    private readonly customerIds: CustomersFacade,
    private readonly orders: OrderQueries,
    private readonly whatsapp: EvolutionWhatsApp,
    @Inject(REALTIME) private readonly realtime: Realtime,
  ) {}

  list(page: number, limit: number, search?: string) {
    return this.customers.list(page, limit, search);
  }

  async detail(id: string) {
    const { customer, stats } = await this.customers.get(id);
    const orders = await this.orders.forCustomer(id);
    return { customer, stats, orders, address: orders[0]?.address ?? null };
  }

  update(id: string, input: { email?: string | null; notes?: string | null }) {
    return this.customers.update(id, input);
  }

  analytics(days?: number) {
    return this.customers.analytics(days);
  }

  messages(customerId: string, page: number, limit: number) {
    return this.whatsapp.history(customerId, Math.max(1, page), Math.min(Math.max(1, limit), 200));
  }

  async send(customerId: string, adminId: string, body: string) {
    const customer = await this.customerIds.findById(customerId);
    if (!customer) throw DomainError.notFound("Customer not found");
    try {
      const id = await this.whatsapp.send(customer.phone, body);
      this.realtime.toAdmins("crm:whatsapp", { customerId });
      return this.whatsapp.record({ customer_id: customerId, admin_id: adminId, direction: "outbound", body, phone: customer.phone, status: "sent", evolution_message_id: id || null });
    } catch (err) {
      await this.whatsapp.record({ customer_id: customerId, admin_id: adminId, direction: "outbound", body, phone: customer.phone, status: "failed" });
      throw err instanceof DomainError ? err : DomainError.unavailable("Failed to send WhatsApp message");
    }
  }

  /** Evolution → n8n → here. Unknown numbers are ignored (no auto-created customers from spam). */
  async inbound(p: { phone: string; body: string; evolutionMessageId: string; mediaUrl?: string; mediaType?: string }) {
    const customer = await this.customerIds.findByPhone(toLocalEgyptPhone(p.phone));
    if (!customer) {
      this.log.debug("inbound WhatsApp from an unknown number ignored");
      return;
    }
    await this.whatsapp.record({ customer_id: customer.id, direction: "inbound", body: p.body, phone: p.phone, status: "delivered", evolution_message_id: p.evolutionMessageId, media_url: p.mediaUrl ?? null, media_type: p.mediaType ?? null }).catch((e) => {
      if ((e as { code?: string }).code !== "P2002") throw e; // duplicate delivery
    });
    this.realtime.toAdmins("crm:whatsapp", { customerId: customer.id });
  }

  async status(evolutionMessageId: string, status: string) {
    await this.whatsapp.setStatus(evolutionMessageId, status);
    this.realtime.toAdmins("crm:whatsapp", { evolutionMessageId, status });
  }
}
