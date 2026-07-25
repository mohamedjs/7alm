import type { OrderWithDetails } from "@/features/shared/types";

/**
 * Thin, lazily-configured Resend HTTP-API email sender for backend
 * "admin alert" notifications. Mirrors the lazy-env pattern of
 * `getN8nWhatsappService()` (see `src/features/whatsapp/n8n-whatsapp.service.ts`),
 * except here a missing config is a log-and-skip, not a throw — a mail
 * failure (or missing config) must never block or fail order creation.
 *
 * No npm dependency — calls Resend's REST API directly via `fetch`
 * (`POST https://api.resend.com/emails`).
 */
class EmailService {
  /**
   * Emails `ADMIN_ALERT_EMAIL` a "new order" alert: order #, customer
   * name, line items, total, and a link to `/admin/orders`.
   *
   * Best-effort — reads its env config lazily on every call, and never
   * throws. If `RESEND_API_KEY` or `ADMIN_ALERT_EMAIL` is not configured,
   * it logs a warning and returns. If the Resend API call itself fails,
   * it logs the error and returns.
   */
  async sendNewOrderAlert(order: OrderWithDetails): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_ALERT_EMAIL;
    const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

    if (!apiKey || !adminEmail) {
      console.warn(
        "email.service: RESEND_API_KEY or ADMIN_ALERT_EMAIL not configured — skipping new-order alert email"
      );
      return;
    }

    try {
      const itemsList =
        order.items.length > 0
          ? order.items
              .map(
                (item) =>
                  `- ${item.product?.name || "منتج"} × ${item.quantity} — ${item.total_price} جنيه`
              )
              .join("\n")
          : `- ${order.product?.name || "منتج"} × ${order.quantity} — ${order.total_price} جنيه`;

      const ordersUrl = appUrl ? `${appUrl}/admin/orders` : "/admin/orders";
      const shortId = order.id.slice(0, 8);
      const subject = `طلب جديد #${shortId} — ${order.customer.full_name}`;
      const text = [
        `طلب جديد رقم: ${shortId}`,
        `العميل: ${order.customer.full_name} (${order.customer.phone})`,
        ``,
        `المنتجات:`,
        itemsList,
        ``,
        `الإجمالي: ${order.total_price} جنيه`,
        ``,
        `عرض الطلب: ${ordersUrl}`,
      ].join("\n");

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [adminEmail],
          subject,
          text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(
          `email.service: Resend send failed (${response.status}): ${errorText}`
        );
      }
    } catch (err) {
      console.error("email.service: Failed to send new-order alert email:", err);
    }
  }
}

export const emailService = new EmailService();
