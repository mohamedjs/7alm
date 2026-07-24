"use client";

import { useCallback, useState } from "react";
import {
  useDisconnectMutation,
  useGetConnectionsQuery,
  useInitiateConnectMutation,
} from "./social.api";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { SocialPlatform } from "@/features/shared/types";

/**
 * Client-side orchestration for the "Social Platform Connections" page.
 *
 * Connect flow is a same-tab redirect: `initiateConnect` returns the
 * provider's `authUrl`, and we hard-navigate to it via
 * `window.location.href`. The backend's OAuth callback 302-redirects back
 * to `/admin/connections?connected={platform}` (or `?error=...`) — reading
 * those query params, toasting, and refetching is handled by the page
 * component (ConnectionsPage), not here.
 */
export function useConnectionsManager() {
  const { t } = useLocale();
  const { data: connections, isLoading, refetch } = useGetConnectionsQuery();
  const [initiateConnect] = useInitiateConnectMutation();
  const [disconnectMutation] = useDisconnectMutation();

  // Tracks which single card is mid-flight so only that card shows a
  // "Connecting..." state — the mutation's own isLoading would otherwise
  // apply to all four cards at once since they share one mutation hook.
  const [pendingPlatform, setPendingPlatform] = useState<SocialPlatform | null>(null);
  const [connectError, setConnectError] = useState<SocialPlatform | null>(null);

  const connect = useCallback(
    async (platform: SocialPlatform) => {
      if (typeof window === "undefined") return;
      setConnectError(null);
      setPendingPlatform(platform);
      try {
        const { authUrl } = await initiateConnect(platform).unwrap();
        window.location.href = authUrl;
      } catch (err) {
        console.error(`Failed to initiate connection for ${platform}:`, err);
        setConnectError(platform);
        setPendingPlatform(null);
      }
    },
    [initiateConnect],
  );

  const disconnect = useCallback(
    async (platform: SocialPlatform) => {
      if (typeof window === "undefined") return;
      if (!window.confirm(t("connections.disconnectConfirm"))) return;
      try {
        await disconnectMutation(platform).unwrap();
      } catch (err) {
        console.error(`Failed to disconnect ${platform}:`, err);
        throw err;
      }
    },
    [disconnectMutation, t],
  );

  return {
    connections: connections ?? [],
    isLoading,
    refetch,
    pendingPlatform,
    connectError,
    connect,
    disconnect,
  };
}
