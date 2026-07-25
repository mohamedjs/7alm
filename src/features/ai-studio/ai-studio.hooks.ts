"use client";

import { useCallback, useState } from "react";
import {
  useGetCampaignsQuery,
  useUpdateCampaignStatusMutation,
  useGenerateCampaignImageMutation,
} from "./ai-studio.api";
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

  // Single shared mutation hook, so only one image generation can be tracked
  // at a time — a second trigger before the first resolves would clobber
  // this state. Reflected in the UI by disabling every row's button while
  // any generation is in flight (see CampaignsList).
  // ponytail: one in-flight generation app-wide; give each row its own
  // useGenerateCampaignImageMutation() call if true concurrent generates matter.
  const [generateImageMutation, generateImageState] = useGenerateCampaignImageMutation();

  const generateImage = useCallback(
    (id: string, prompt?: string) => generateImageMutation({ id, prompt }).unwrap(),
    [generateImageMutation]
  );

  const generatingId = generateImageState.isLoading
    ? (generateImageState.originalArgs?.id ?? null)
    : null;

  return {
    campaigns: data ?? [],
    isLoading,
    statusFilter,
    setStatusFilter,
    markPublished,
    archive,
    generateImage,
    generatingId,
  };
}
