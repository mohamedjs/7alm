import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { ENV } from "../../../shared/infrastructure/config/config.module";
import type { Env } from "../../../shared/infrastructure/config/env";
import { iso } from "../../../shared/infrastructure/prisma/decimal";
import { DomainError } from "../../../shared/domain/domain-error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dto = (m: any) => ({ ...m, created_at: iso(m.created_at), updated_at: iso(m.updated_at) });

/**
 * The existing Evolution API WhatsApp channel (spec 012): the backend never
 * calls Evolution directly — n8n does, behind a shared-secret webhook.
 * Kept alongside the official WhatsApp Cloud API inbox so stores can use either.
 */
@Injectable()
export class EvolutionWhatsApp {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** n8n / Evolution expect international digits: 01xxxxxxxxx → 201xxxxxxxxx. */
  static international(phone: string): string {
    let d = phone.replace(/\D/g, "");
    if (d.startsWith("0")) d = "20" + d.slice(1);
    if (d.length === 10 && !d.startsWith("20")) d = "20" + d;
    return d;
  }

  async send(phone: string, body: string): Promise<string> {
    if (!this.env.N8N_WHATSAPP_SEND_WEBHOOK_URL || !this.env.N8N_SEND_WEBHOOK_SECRET) {
      throw DomainError.unavailable("N8N_WHATSAPP_SEND_WEBHOOK_URL / N8N_SEND_WEBHOOK_SECRET are not set");
    }
    const res = await fetch(this.env.N8N_WHATSAPP_SEND_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-N8n-Send-Secret": this.env.N8N_SEND_WEBHOOK_SECRET },
      body: JSON.stringify({ phone: EvolutionWhatsApp.international(phone), body }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw DomainError.unavailable(`n8n WhatsApp send failed (${res.status})`);
    const data = (await res.json().catch(() => ({}))) as { messageId?: string };
    return data.messageId ?? "";
  }

  record(input: { customer_id: string; admin_id?: string | null; direction: "inbound" | "outbound"; body: string; phone: string; status: string; evolution_message_id?: string | null; media_url?: string | null; media_type?: string | null }) {
    return this.prisma.whatsappMessage.create({ data: input }).then(dto);
  }

  async setStatus(evolutionId: string, status: string) {
    await this.prisma.whatsappMessage.updateMany({ where: { evolution_message_id: evolutionId }, data: { status } });
  }

  async history(customerId: string, page: number, limit: number) {
    const [rows, total] = await Promise.all([
      this.prisma.whatsappMessage.findMany({ where: { customer_id: customerId }, orderBy: { created_at: "desc" }, skip: (page - 1) * limit, take: limit }),
      this.prisma.whatsappMessage.count({ where: { customer_id: customerId } }),
    ]);
    return { data: rows.map(dto), totalCount: total, page, limit };
  }
}
