import { Inject, Injectable, Logger } from "@nestjs/common";
import { ENV } from "../../../shared/infrastructure/config/config.module";
import type { Env } from "../../../shared/infrastructure/config/env";

export interface N8nOrderNotification {
  orderId: string;
  newStatus: string;
  customerPhone: string;
  customerName: string;
  productName: string;
  trackingId: string | null;
  totalPrice: number;
  quantity: number;
  items: Array<{ productName: string; quantity: number; unitPrice: number; totalPrice: number }>;
  reviewUrl?: string;
}

/** Hands the customer WhatsApp notification to the n8n order-notifications workflow. */
@Injectable()
export class N8nOrderNotifier {
  constructor(@Inject(ENV) private readonly env: Env) {}

  get enabled() {
    return !!this.env.N8N_ORDER_WEBHOOK_URL;
  }

  async send(payload: N8nOrderNotification): Promise<void> {
    const res = await fetch(this.env.N8N_ORDER_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`n8n order webhook ${res.status}`);
  }
}

/** Admin alert emails through Resend. */
@Injectable()
export class ResendEmailSender {
  private readonly log = new Logger(ResendEmailSender.name);
  constructor(@Inject(ENV) private readonly env: Env) {}

  get enabled() {
    return !!(this.env.RESEND_API_KEY && this.env.ADMIN_ALERT_EMAIL);
  }

  async sendToAdmin(subject: string, text: string): Promise<void> {
    if (!this.enabled) {
      this.log.warn("RESEND_API_KEY or ADMIN_ALERT_EMAIL not set — skipping admin email");
      return;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: this.env.EMAIL_FROM, to: [this.env.ADMIN_ALERT_EMAIL], subject, text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text().catch(() => "")}`);
  }
}
