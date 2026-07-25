"use client";

import { useAiStudioManager } from "@/features/ai-studio/ai-studio.hooks";
import { TrendsList } from "@/components/admin/ai-studio/TrendsList";
import { AddTrendForm } from "@/components/admin/ai-studio/AddTrendForm";
import { IdeasList } from "@/components/admin/ai-studio/IdeasList";
import { useLocale } from "@/features/i18n/i18n.hooks";

export default function AiStudioPage() {
  const {
    trends,
    isLoadingTrends,
    addTrend,
    isAddingTrend,
    ideas,
    isLoadingIdeas,
    ideaStatusFilter,
    setIdeaStatusFilter,
  } = useAiStudioManager();
  const { t } = useLocale();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">{t("aiStudio.title")}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold text-text-primary">{t("aiStudio.trends.title")}</h2>
          <TrendsList trends={trends} isLoading={isLoadingTrends} />
        </div>
        <AddTrendForm onSubmit={addTrend} isSubmitting={isAddingTrend} />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">{t("aiStudio.ideas.title")}</h2>
        <IdeasList
          ideas={ideas}
          isLoading={isLoadingIdeas}
          statusFilter={ideaStatusFilter}
          onStatusFilterChange={setIdeaStatusFilter}
        />
      </div>
    </div>
  );
}
