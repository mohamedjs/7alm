"use client";

import { Sparkles, Star } from "lucide-react";
import { useLocale } from "@/features/i18n/i18n.hooks";
import { DesignIdeaStateMachine } from "@/lib/designIdeaStateMachine";
import type { DesignIdea, DesignIdeaStatus } from "@/features/shared/types";

export interface IdeasListProps {
  ideas: DesignIdea[];
  isLoading: boolean;
  statusFilter: DesignIdeaStatus | undefined;
  onStatusFilterChange: (status: DesignIdeaStatus | undefined) => void;
}

const STATUSES: DesignIdeaStatus[] = [
  "pending_review",
  "approved",
  "published",
  "rejected",
];

function formatDate(value: string, locale: string): string {
  return new Date(value).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Read-only design-ideas feed for `/admin/ai-studio`, grouped/filterable by
 * status. Approve/reject/publish only happen via the Telegram approval loop
 * (spec 013) — this view exists so the pipeline is observable without
 * Telegram (FR-015), not to duplicate the action buttons.
 */
export function IdeasList({ ideas, isLoading, statusFilter, onStatusFilterChange }: IdeasListProps) {
  const { t, locale } = useLocale();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => onStatusFilterChange(undefined)}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
            statusFilter === undefined
              ? "neu-pressed bg-surface text-brand-500"
              : "text-text-muted hover:text-text-primary hover:neu-raised-sm"
          }`}
        >
          {t("aiStudio.ideas.filter.all")}
        </button>
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => onStatusFilterChange(status)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              statusFilter === status
                ? "neu-pressed bg-surface text-brand-500"
                : "text-text-muted hover:text-text-primary hover:neu-raised-sm"
            }`}
          >
            {t(DesignIdeaStateMachine[status].labelKey)}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface neu-raised">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 w-full animate-pulse rounded-xl bg-surface-raised" />
            ))}
          </div>
        ) : ideas.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-text-muted">
            <Sparkles className="h-12 w-12" />
            <p className="text-lg font-medium">{t("aiStudio.ideas.empty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {ideas.map((idea) => {
              const state = DesignIdeaStateMachine[idea.status];
              return (
                <div key={idea.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text-primary">{idea.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-text-muted">{idea.description}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {idea.is_favorite && (
                        <Star
                          className="h-4 w-4 fill-amber-400 text-amber-400"
                          aria-label={t("aiStudio.ideas.favorite")}
                        />
                      )}
                      <span
                        className={`whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-medium ${state.colorClass}`}
                      >
                        {t(state.labelKey)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-text-muted">{formatDate(idea.created_at, locale)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
