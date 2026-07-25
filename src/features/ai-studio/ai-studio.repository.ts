import { supabase } from "@/lib/supabase";
import type { Trend, TrendInput, TrendStatus } from "@/features/shared/types";

/**
 * Repository for the AI Studio `trends` table — the "Trend Hunter" agent's
 * data layer. The only file that touches Supabase for trend storage.
 *
 * Following the project's Repository Pattern: this file contains raw
 * queries only. Business rules (deduplication, scoring, what counts as
 * "used") live in `ai-studio.service.ts`.
 *
 * NOTE: additional repositories (design-ideas, generated-assets,
 * marketing-content, ad-campaigns, analytics, ai-memory) follow this same
 * shape and are scaffolded in later phases — see specs/013-ai-studio/tasks.md.
 */
export class AiStudioRepository {
  /** List trends, newest first, optionally filtered by status. */
  async listTrends(status?: TrendStatus): Promise<Trend[]> {
    let query = supabase.from("trends").select("*").order("collected_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching trends:", error);
      throw error;
    }
    return data ?? [];
  }

  /** Fetch a single trend by its (source, fingerprint) dedup key. */
  async getByFingerprint(source: string, fingerprint: string): Promise<Trend | null> {
    const { data, error } = await supabase
      .from("trends")
      .select("*")
      .eq("source", source)
      .eq("fingerprint", fingerprint)
      .single();

    if (error) {
      if (error.code !== "PGRST116") {
        // not found is expected for a brand-new signal
        console.error("Error fetching trend by fingerprint:", error);
      }
      return null;
    }
    return data;
  }

  /** Insert a brand-new trend row. */
  async create(input: TrendInput & { fingerprint: string }): Promise<Trend> {
    const { data, error } = await supabase
      .from("trends")
      .insert({
        source: input.source,
        fingerprint: input.fingerprint,
        raw_signal: input.raw_signal,
        summary: input.summary ?? null,
        score: input.score ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating trend:", error);
      throw error;
    }
    return data;
  }

  /** Refresh recency/score on a trend that reappeared in a later collection run. */
  async touch(id: string, patch: { score?: number | null; summary?: string | null }): Promise<Trend> {
    const { data, error } = await supabase
      .from("trends")
      .update({
        ...(patch.score !== undefined ? { score: patch.score } : {}),
        ...(patch.summary !== undefined ? { summary: patch.summary } : {}),
        collected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error touching trend:", error);
      throw error;
    }
    return data;
  }

  /** Mark trends as consumed once a design idea has been generated from them. */
  async markUsed(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const { error } = await supabase
      .from("trends")
      .update({ status: "used", updated_at: new Date().toISOString() })
      .in("id", ids);

    if (error) {
      console.error("Error marking trends as used:", error);
      throw error;
    }
  }
}
