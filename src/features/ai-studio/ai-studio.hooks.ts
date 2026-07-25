"use client";

import { useCallback, useState } from "react";
import { useAddTrendMutation, useGetIdeasQuery, useGetTrendsQuery } from "./ai-studio.api";
import type { DesignIdeaStatus, TrendInput } from "@/features/shared/types";

/**
 * Drives `/admin/ai-studio`: the trends feed, the manual "add trend" form
 * (the real pipeline entry point — no scraper credentials exist for any
 * source), and the design-ideas feed filtered by status.
 */
export function useAiStudioManager() {
  const { data: trends, isLoading: isLoadingTrends } = useGetTrendsQuery();
  const [addTrendMutation, { isLoading: isAddingTrend }] = useAddTrendMutation();

  const [ideaStatusFilter, setIdeaStatusFilter] = useState<DesignIdeaStatus | undefined>(
    undefined,
  );
  const { data: ideas, isLoading: isLoadingIdeas } = useGetIdeasQuery(ideaStatusFilter);

  const addTrend = useCallback(
    async (input: TrendInput) => {
      await addTrendMutation(input).unwrap();
    },
    [addTrendMutation],
  );

  return {
    trends: trends ?? [],
    isLoadingTrends,
    addTrend,
    isAddingTrend,
    ideas: ideas ?? [],
    isLoadingIdeas,
    ideaStatusFilter,
    setIdeaStatusFilter,
  };
}
