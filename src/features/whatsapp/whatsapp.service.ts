import { getN8nWhatsappService } from "./n8n-whatsapp.service";
import { whatsappMessageRepository } from "./whatsapp-message.repository";
import { customerRepository } from "@/features/customers/customers.repository";
import type {
  WhatsAppMessage,
  PaginatedResponse,
  InboundWebhookPayload,
  StatusWebhookPayload,
} from "@/features/shared/types";

export class WhatsAppService {
  normalizePhone(phone: string): string {
    let digits = phone.replace(/\D/g, "");
    if (digits.startsWith("0")) {
      digits = "20" + digits.substring(1);
    }
    if (digits.length === 10 && !digits.startsWith("20")) {
      digits = "20" + digits;
    }
    return digits;
  }

  async sendMessage(
    customerId: string,
    adminId: string,
    body: string
  ): Promise<WhatsAppMessage> {
    const customer = await customerRepository.getById(customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }
    if (!customer.phone) {
      throw new Error("Customer has no phone number");
    }

    const normalizedPhone = this.normalizePhone(customer.phone);
    let evolutionMessageId: string | null = null;
    let status: "sent" | "failed" = "sent";

    try {
      const result = await getN8nWhatsappService().send({
        phone: normalizedPhone,
        body,
      });
      evolutionMessageId = result.messageId;
    } catch (error) {
      console.error("n8n WhatsApp send failed:", error);
      status = "failed";
    }

    const message = await whatsappMessageRepository.create({
      customer_id: customerId,
      admin_id: adminId,
      direction: "outbound",
      body,
      phone: customer.phone,
      status,
      evolution_message_id: evolutionMessageId,
    });

    if (status === "failed") {
      throw new Error("Failed to send WhatsApp message");
    }

    return message;
  }

  async processInboundMessage(
    payload: InboundWebhookPayload
  ): Promise<void> {
    const normalizedPhone = this.normalizePhone(payload.phone);
    const customer = await customerRepository.findByPhone(normalizedPhone);

    if (!customer) {
      console.warn(
        `Inbound message from unknown phone: ${normalizedPhone.slice(0, 4)}****`
      );
      return;
    }

    await whatsappMessageRepository.create({
      customer_id: customer.id,
      direction: "inbound",
      body: payload.body,
      phone: payload.phone,
      status: "delivered",
      evolution_message_id: payload.evolutionMessageId,
      media_url: payload.mediaUrl || null,
      media_type: payload.mediaType || null,
    });
  }

  async processStatusUpdate(
    payload: StatusWebhookPayload
  ): Promise<void> {
    const existing = await whatsappMessageRepository.findByEvolutionId(
      payload.evolutionMessageId
    );

    if (!existing) {
      console.warn(
        `Status update for unknown message: ${payload.evolutionMessageId}`
      );
      return;
    }

    await whatsappMessageRepository.updateStatus(
      payload.evolutionMessageId,
      payload.status
    );
  }

  async getMessages(
    customerId: string,
    page: number,
    limit: number
  ): Promise<PaginatedResponse<WhatsAppMessage>> {
    const result = await whatsappMessageRepository.getByCustomerId(
      customerId,
      page,
      limit
    );
    return {
      data: result.data,
      totalCount: result.totalCount,
      page,
      limit,
    };
  }
}

export const whatsappService = new WhatsAppService();
