"use client";

import { useAiStudioManager, type CampaignStatusFilter } from "@/features/ai-studio/ai-studio.hooks";
import { CampaignsList } from "@/components/admin/ai-studio/CampaignsList";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { DictKey } from "@/features/i18n/dictionary";

const FILTERS: { status: CampaignStatusFilter; key: DictKey }[] = [
  { status: "all", key: "aiStudio.filter.all" },
  { status: "draft", key: "aiStudio.status.draft" },
  { status: "ready", key: "aiStudio.status.ready" },
  { status: "published", key: "aiStudio.status.published" },
  { status: "archived", key: "aiStudio.status.archived" },
];

export default function AiStudioPage() {
  const { t } = useLocale();
  const { campaigns, isLoading, statusFilter, setStatusFilter, markPublished, archive } =
    useAiStudioManager();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t("aiStudio.title")}</h1>
        <p className="text-text-muted">{t("aiStudio.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setStatusFilter(filter.status)}
            aria-pressed={statusFilter === filter.status}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              statusFilter === filter.status
                ? "neu-pressed bg-surface text-brand-500"
                : "neu-raised bg-surface text-text-muted hover:text-text-primary"
            }`}
          >
            {t(filter.key)}
          </button>
        ))}
      </div>

      <CampaignsList
        campaigns={campaigns}
        isLoading={isLoading}
        onMarkPublished={markPublished}
        onArchive={archive}
      />
    </div>
  );
}
