"use client";

import { TrendingUp } from "lucide-react";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { DictKey } from "@/features/i18n/dictionary";
import type { Trend, TrendSource, TrendStatus } from "@/features/shared/types";

export interface TrendsListProps {
  trends: Trend[];
  isLoading: boolean;
}

const SOURCE_KEYS: Record<TrendSource, DictKey> = {
  pinterest: "aiStudio.trends.source.pinterest",
  etsy: "aiStudio.trends.source.etsy",
  tiktok: "aiStudio.trends.source.tiktok",
  instagram: "aiStudio.trends.source.instagram",
  google_trends: "aiStudio.trends.source.google_trends",
  reddit: "aiStudio.trends.source.reddit",
  amazon: "aiStudio.trends.source.amazon",
  manual: "aiStudio.trends.source.manual",
};

const STATUS_KEYS: Record<TrendStatus, DictKey> = {
  new: "aiStudio.trends.status.new",
  summarized: "aiStudio.trends.status.summarized",
  used: "aiStudio.trends.status.used",
  archived: "aiStudio.trends.status.archived",
};

function formatDate(value: string, locale: string): string {
  return new Date(value).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Read-only trends feed for `/admin/ai-studio`. Follows `CustomerList`'s
 * structure (skeleton → empty state → desktop table / mobile cards) — there
 * is no shared table primitive in this repo.
 */
export function TrendsList({ trends, isLoading }: TrendsListProps) {
  const { t, locale } = useLocale();

  return (
    <div className="overflow-hidden rounded-2xl bg-surface neu-raised">
      {isLoading ? (
        <div className="space-y-3 p-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-surface-raised" />
          ))}
        </div>
      ) : trends.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 p-12 text-text-muted">
          <TrendingUp className="h-12 w-12" />
          <p className="text-lg font-medium">{t("aiStudio.trends.empty")}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/20 text-sm text-text-muted">
                  <th className="px-6 py-4 text-start font-medium">{t("aiStudio.trends.col.source")}</th>
                  <th className="px-6 py-4 text-start font-medium">{t("aiStudio.trends.col.summary")}</th>
                  <th className="px-6 py-4 text-start font-medium">{t("aiStudio.trends.col.score")}</th>
                  <th className="px-6 py-4 text-start font-medium">{t("aiStudio.trends.col.status")}</th>
                  <th className="px-6 py-4 text-start font-medium">{t("aiStudio.trends.col.collectedAt")}</th>
                </tr>
              </thead>
              <tbody>
                {trends.map((trend) => (
                  <tr key={trend.id} className="border-b border-border/10">
                    <td className="px-6 py-4 font-medium text-text-primary">
                      {t(SOURCE_KEYS[trend.source])}
                    </td>
                    <td className="max-w-md truncate px-6 py-4 text-text-muted">
                      {trend.summary || "—"}
                    </td>
                    <td className="px-6 py-4 text-text-primary">{trend.score ?? "—"}</td>
                    <td className="px-6 py-4 text-text-muted">{t(STATUS_KEYS[trend.status])}</td>
                    <td className="px-6 py-4 text-sm text-text-muted">
                      {formatDate(trend.collected_at, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-border/20 lg:hidden">
            {trends.map((trend) => (
              <div key={trend.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-text-primary">{t(SOURCE_KEYS[trend.source])}</p>
                  <p className="text-xs text-text-muted">{t(STATUS_KEYS[trend.status])}</p>
                </div>
                <p className="mt-1 text-sm text-text-muted">{trend.summary || "—"}</p>
                <p className="mt-1 text-xs text-text-muted">{formatDate(trend.collected_at, locale)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
