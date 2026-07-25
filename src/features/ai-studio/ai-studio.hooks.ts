"use client";

import { useCallback, useState } from "react";
import { useGetCampaignsQuery, useUpdateCampaignStatusMutation } from "./ai-studio.api";
import type { AdCampaignStatus } from "@/features/shared/types";

export type CampaignStatusFilter = AdCampaignStatus | "all";

/**
 * Drives `/admin/ai-studio`: campaign list filtered by status, plus
 * publish/archive actions via the shared status-update mutation.
 */
export function useAiStudioManager() {
  const [statusFilter, setStatusFilter] = useState<CampaignStatusFilter>("all");

  const { data, isLoading } = useGetCampaignsQuery(
    statusFilter === "all" ? undefined : statusFilter
  );
  const [updateStatusMutation] = useUpdateCampaignStatusMutation();

  const markPublished = useCallback(
    (id: string) => updateStatusMutation({ id, status: "published" }).unwrap(),
    [updateStatusMutation]
  );

  const archive = useCallback(
    (id: string) => updateStatusMutation({ id, status: "archived" }).unwrap(),
    [updateStatusMutation]
  );

  return {
    campaigns: data ?? [],
    isLoading,
    statusFilter,
    setStatusFilter,
    markPublished,
    archive,
  };
}
