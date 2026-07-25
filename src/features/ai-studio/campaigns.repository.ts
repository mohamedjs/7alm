import { supabase } from "@/lib/supabase";
import type { AdCampaign, AdCampaignInput, AdCampaignStatus } from "@/features/shared/types";

/**
 * Repository for the `ad_campaigns` table — the sink for the Telegram
 * marketing agent's chat-approved campaigns (spec 013, conversational pivot).
 */
export class CampaignsRepository {
  async list(status?: AdCampaignStatus): Promise<AdCampaign[]> {
    let query = supabase
      .from("ad_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error listing ad campaigns:", error);
      throw error;
    }
    return data ?? [];
  }

  async getById(id: string): Promise<AdCampaign | null> {
    const { data, error } = await supabase
      .from("ad_campaigns")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching ad campaign:", error);
      throw error;
    }
    return data;
  }

  async create(input: AdCampaignInput): Promise<AdCampaign> {
    const { data, error } = await supabase
      .from("ad_campaigns")
      .insert({
        name: input.name,
        niche: input.niche,
        objective: input.objective,
        research_summary: input.research_summary ?? null,
        headline: input.headline,
        primary_text: input.primary_text,
        cta: input.cta,
        hashtags: input.hashtags ?? null,
        platform: input.platform ?? null,
        target_audience: input.target_audience ?? {},
        telegram_chat_id: input.telegram_chat_id ?? null,
        status: input.status ?? "ready",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating ad campaign:", error);
      throw error;
    }
    return data;
  }

  async updateStatus(id: string, status: AdCampaignStatus): Promise<AdCampaign> {
    const { data, error } = await supabase
      .from("ad_campaigns")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating ad campaign status:", error);
      throw error;
    }
    return data;
  }
}
