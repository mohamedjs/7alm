import type { N8nSendRequest, N8nSendResponse } from "@/features/shared/types";

class N8nWhatsappService {
  private webhookUrl: string;
  private secret: string;

  constructor() {
    const webhookUrl = process.env.N8N_WHATSAPP_SEND_WEBHOOK_URL;
    const secret = process.env.N8N_SEND_WEBHOOK_SECRET;

    if (!webhookUrl)
      throw new Error("N8N_WHATSAPP_SEND_WEBHOOK_URL is not set");
    if (!secret) throw new Error("N8N_SEND_WEBHOOK_SECRET is not set");

    this.webhookUrl = webhookUrl;
    this.secret = secret;
  }

  async send(request: N8nSendRequest): Promise<N8nSendResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-N8n-Send-Secret": this.secret,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(
          `n8n WhatsApp send failed (${response.status}): ${errorText}`
        );
      }

      return (await response.json()) as N8nSendResponse;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("n8n WhatsApp send timed out after 10s");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

let _instance: N8nWhatsappService | null = null;

export function getN8nWhatsappService(): N8nWhatsappService {
  if (!_instance) {
    _instance = new N8nWhatsappService();
  }
  return _instance;
}
