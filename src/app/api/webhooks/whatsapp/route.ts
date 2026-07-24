import { NextRequest, NextResponse } from "next/server";
import { whatsappService } from "@/features/whatsapp/whatsapp.service";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-webhook-secret");
    const expectedSecret = process.env.WHATSAPP_WEBHOOK_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await req.json();

    if (payload.type === "message") {
      await whatsappService.processInboundMessage({
        phone: payload.phone,
        body: payload.body,
        evolutionMessageId: payload.evolutionMessageId,
        mediaUrl: payload.mediaUrl,
        mediaType: payload.mediaType,
      });
    } else if (payload.type === "status") {
      await whatsappService.processStatusUpdate({
        evolutionMessageId: payload.evolutionMessageId,
        status: payload.status,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("WhatsApp Webhook Error:", error);
    return NextResponse.json({ success: true });
  }
}
