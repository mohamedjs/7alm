import { supabase } from "@/lib/supabase";
import type { WhatsAppMessage, WhatsAppMessageInput, WhatsAppMessageStatus } from "@/features/shared/types";

export class WhatsAppMessageRepository {
  async create(msg: WhatsAppMessageInput): Promise<WhatsAppMessage> {
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .insert([msg])
      .select()
      .single();

    if (error) {
      console.error("Error creating WhatsApp message:", error);
      throw error;
    }

    return data as WhatsAppMessage;
  }

  async getByCustomerId(
    customerId: string,
    page: number,
    limit: number
  ): Promise<{ data: WhatsAppMessage[]; totalCount: number }> {
    const { data, error, count } = await supabase
      .from("whatsapp_messages")
      .select("*", { count: "exact" })
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error("Error getting messages:", error);
      return { data: [], totalCount: 0 };
    }

    return { data: (data as WhatsAppMessage[]) || [], totalCount: count || 0 };
  }

  async updateStatus(
    evolutionMessageId: string,
    status: WhatsAppMessageStatus
  ): Promise<void> {
    const { error } = await supabase
      .from("whatsapp_messages")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("evolution_message_id", evolutionMessageId);

    if (error) {
      console.error("Error updating message status:", error);
    }
  }

  async findByEvolutionId(
    evolutionMessageId: string
  ): Promise<WhatsAppMessage | null> {
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("evolution_message_id", evolutionMessageId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error finding message:", error);
    }

    return (data as WhatsAppMessage | null) || null;
  }

  async getRecentByCustomerId(
    customerId: string,
    limit: number
  ): Promise<WhatsAppMessage[]> {
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error getting recent messages:", error);
      return [];
    }

    return (data as WhatsAppMessage[]) || [];
  }
}

export const whatsappMessageRepository = new WhatsAppMessageRepository();
