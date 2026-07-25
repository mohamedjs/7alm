import { supabase } from "@/lib/supabase";
import type {
  DesignIdea,
  DesignIdeaStatus,
  TelegramApprovalAction,
  TelegramApprovalLog,
} from "@/features/shared/types";

/**
 * Repository for the AI Studio `design_ideas` + `telegram_approval_logs`
 * tables. The only file that touches Supabase for design-idea storage and
 * its approval audit trail.
 *
 * Following the project's Repository Pattern: this file contains raw
 * queries only. Business rules (the state machine, dedup, publish→products
 * orchestration) live in `design-ideas.service.ts`.
 *
 * Follows the exact shape of `ai-studio.repository.ts` (the trends slice).
 */
export class DesignIdeasRepository {
  /** List design ideas, newest first, optionally filtered by status. */
  async listByStatus(status?: DesignIdeaStatus): Promise<DesignIdea[]> {
    let query = supabase.from("design_ideas").select("*").order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching design ideas:", error);
      throw error;
    }
    return data ?? [];
  }

  /** Fetch a single design idea by id. */
  async getById(id: string): Promise<DesignIdea | null> {
    const { data, error } = await supabase
      .from("design_ideas")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code !== "PGRST116") {
        console.error("Error fetching design idea by id:", error);
      }
      return null;
    }
    return data;
  }

  /** Fetch a design idea by its concept dedup key. */
  async getByConceptFingerprint(fingerprint: string): Promise<DesignIdea | null> {
    const { data, error } = await supabase
      .from("design_ideas")
      .select("*")
      .eq("concept_fingerprint", fingerprint)
      .single();

    if (error) {
      if (error.code !== "PGRST116") {
        console.error("Error fetching design idea by fingerprint:", error);
      }
      return null;
    }
    return data;
  }

  /** Insert a brand-new design idea in `pending_review`. */
  async create(input: {
    title: string;
    description: string;
    concept_fingerprint: string;
    source_trend_ids: string[];
  }): Promise<DesignIdea> {
    const { data, error } = await supabase
      .from("design_ideas")
      .insert({
        title: input.title,
        description: input.description,
        concept_fingerprint: input.concept_fingerprint,
        source_trend_ids: input.source_trend_ids,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating design idea:", error);
      throw error;
    }
    return data;
  }

  /** Update a design idea's status (and optionally its linked `product_id` on publish). */
  async updateStatus(
    id: string,
    status: DesignIdeaStatus,
    patch: { product_id?: string } = {}
  ): Promise<DesignIdea> {
    const { data, error } = await supabase
      .from("design_ideas")
      .update({
        status,
        ...(patch.product_id !== undefined ? { product_id: patch.product_id } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating design idea status:", error);
      throw error;
    }
    return data;
  }

  /** Toggle `is_favorite` on a design idea. No status change. */
  async setFavorite(id: string, isFavorite: boolean): Promise<DesignIdea> {
    const { data, error } = await supabase
      .from("design_ideas")
      .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error toggling design idea favorite:", error);
      throw error;
    }
    return data;
  }

  /** Append an audit row for every Telegram approval-workflow action. */
  async logApprovalAction(input: {
    design_idea_id: string;
    action: TelegramApprovalAction;
    telegram_user_id: string | null;
    previous_status: string | null;
    new_status: string | null;
    note?: string | null;
  }): Promise<TelegramApprovalLog> {
    const { data, error } = await supabase
      .from("telegram_approval_logs")
      .insert({
        design_idea_id: input.design_idea_id,
        action: input.action,
        telegram_user_id: input.telegram_user_id,
        previous_status: input.previous_status,
        new_status: input.new_status,
        note: input.note ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error writing telegram approval log:", error);
      throw error;
    }
    return data;
  }
}

export const designIdeasRepository = new DesignIdeasRepository();
