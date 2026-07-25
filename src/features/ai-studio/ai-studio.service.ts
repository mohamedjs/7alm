import crypto from "crypto";
import { AiStudioRepository } from "@/features/ai-studio/ai-studio.repository";
import type { Trend, TrendInput } from "@/features/shared/types";

/**
 * "Trend Hunter" + "Market Research" agent logic (Phase 1 slice — see
 * specs/013-ai-studio/plan.md for the full agent→file mapping).
 *
 * Owns:
 *  - Fingerprinting a raw signal so the same trend is never stored twice
 *    (FR-001).
 *  - Deciding whether a collected signal is new (insert) or a reappearance
 *    of a known trend (touch/refresh) — the "prevent duplicates" rule
 *    applied at the trend-storage layer.
 *
 * Text summarization/scoring of a signal (via GEMINI_API_TOKEN) is
 * intentionally NOT implemented yet — this phase focuses on a correct,
 * testable storage contract that a real collector (n8n workflow or admin
 * "add trend" form) can be built against. See tasks.md T007+ for the next
 * increment (API route + summarization call).
 */
export class AiStudioService {
  constructor(private readonly repo: AiStudioRepository = new AiStudioRepository()) {}

  async listTrends(status?: Trend["status"]): Promise<Trend[]> {
    return this.repo.listTrends(status);
  }

  /**
   * Record a collected trend signal, deduplicating against prior
   * collections of the same signal from the same source.
   *
   * - If no trend with this (source, fingerprint) exists yet: insert it.
   * - If one already exists: refresh its recency/score instead of creating
   *   a duplicate row (spec.md User Story 1, Acceptance Scenario 2).
   */
  async recordTrend(input: TrendInput): Promise<Trend> {
    const fingerprint = AiStudioService.fingerprint(input.source, input.raw_signal);

    const existing = await this.repo.getByFingerprint(input.source, fingerprint);
    if (existing) {
      return this.repo.touch(existing.id, {
        score: input.score ?? existing.score,
        summary: input.summary ?? existing.summary,
      });
    }

    return this.repo.create({ ...input, fingerprint });
  }

  async markTrendsUsed(ids: string[]): Promise<void> {
    return this.repo.markUsed(ids);
  }

  /**
   * Deterministic dedup key for a raw signal: normalizes the payload
   * (stable key ordering) before hashing so semantically-identical
   * signals collected in a different field order still collide correctly.
   */
  static fingerprint(source: string, rawSignal: Record<string, unknown>): string {
    const normalized = AiStudioService.stableStringify(rawSignal);
    return crypto.createHash("sha256").update(`${source}:${normalized}`).digest("hex");
  }

  private static stableStringify(value: unknown): string {
    if (value === null || typeof value !== "object") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map((v) => AiStudioService.stableStringify(v)).join(",")}]`;
    }
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const entries = keys.map(
      (k) => `${JSON.stringify(k)}:${AiStudioService.stableStringify((value as Record<string, unknown>)[k])}`
    );
    return `{${entries.join(",")}}`;
  }
}
