"use client";

import { useState, type FormEvent } from "react";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { TrendInput } from "@/features/shared/types";
import Textarea from "@/components/ui/Textarea";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export interface AddTrendFormProps {
  onSubmit: (input: TrendInput) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Manual "add trend" form — the real entry point for the AI Studio pipeline
 * (spec 013): no scraper credentials exist for any source, so this is how
 * the Design Director gets input, not a stopgap.
 *
 * No source picker: `POST /api/admin/ai-studio/trends` always forces
 * `source: "manual"` server-side (see that route's handler) — offering a
 * choice the backend silently discards would just mislead the admin.
 */
export function AddTrendForm({ onSubmit, isSubmitting }: AddTrendFormProps) {
  const { t } = useLocale();
  const [summary, setSummary] = useState("");
  const [score, setScore] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!summary.trim() || isSubmitting) return;
    await onSubmit({
      source: "manual",
      summary: summary.trim(),
      score: score.trim() ? Number(score) : null,
      raw_signal: { manual: true },
    });
    setSummary("");
    setScore("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-surface p-6 neu-raised">
      <h2 className="text-lg font-semibold text-text-primary">{t("aiStudio.trends.addTitle")}</h2>

      <Textarea
        label={t("aiStudio.trends.summary")}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder={t("aiStudio.trends.summaryPlaceholder")}
        rows={3}
        required
      />

      <Input
        type="number"
        step="0.01"
        min="0"
        max="1"
        label={t("aiStudio.trends.score")}
        placeholder={t("aiStudio.trends.scorePlaceholder")}
        value={score}
        onChange={(e) => setScore(e.target.value)}
      />

      <Button type="submit" disabled={isSubmitting || !summary.trim()}>
        {isSubmitting ? t("aiStudio.trends.submitting") : t("aiStudio.trends.submit")}
      </Button>
    </form>
  );
}
