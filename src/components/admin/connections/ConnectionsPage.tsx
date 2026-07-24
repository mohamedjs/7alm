"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConnectionsManager } from "@/features/social/social.hooks";
import { PLATFORM_NAME_KEY, PlatformCard } from "./PlatformCard";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { SocialPlatform } from "@/features/shared/types";

const PLATFORMS: SocialPlatform[] = ["facebook", "instagram", "tiktok", "whatsapp"];

interface Banner {
  kind: "success" | "error";
  message: string;
}

export function ConnectionsPage() {
  const { t } = useLocale();
  const router = useRouter();
  const { connections, isLoading, pendingPlatform, connect, disconnect, refetch } =
    useConnectionsManager();
  const [banner, setBanner] = useState<Banner | null>(null);

  // Read `?connected=`/`?error=` set by the OAuth callback's 302 redirect,
  // toast + refetch, then strip the query string. Reading via
  // `window.location.search` (not `useSearchParams`) avoids the Next.js
  // requirement to wrap the page in a Suspense boundary.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");

    if (connected) {
      const platform = PLATFORMS.includes(connected as SocialPlatform)
        ? (connected as SocialPlatform)
        : null;
      setBanner({
        kind: "success",
        message: platform
          ? t("connections.toast.connected").replace("{platform}", t(PLATFORM_NAME_KEY[platform]))
          : t("connections.toast.error"),
      });
      refetch();
    } else if (error) {
      setBanner({ kind: "error", message: t("connections.toast.error") });
    }

    if (connected || error) {
      params.delete("connected");
      params.delete("error");
      const query = params.toString();
      router.replace(`/admin/connections${query ? `?${query}` : ""}`);
    }
    // Runs once on mount to consume the redirect params — intentionally
    // excludes `t`/`refetch`/`router` from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectionByPlatform = new Map(connections.map((c) => [c.platform, c]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t("connections.title")}</h1>
        <p className="mt-1 text-sm text-text-muted">{t("connections.subtitle")}</p>
      </div>

      {banner && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-2xl border px-4 py-3 text-sm ${
            banner.kind === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {banner.message}
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-text-muted">{t("common.loading")}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORMS.map((platform) => (
            <PlatformCard
              key={platform}
              platform={platform}
              connection={connectionByPlatform.get(platform)}
              isPending={pendingPlatform === platform}
              onConnect={connect}
              onDisconnect={disconnect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
