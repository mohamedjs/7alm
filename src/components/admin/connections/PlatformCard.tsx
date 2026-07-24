"use client";

import Image from "next/image";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { DictKey } from "@/features/i18n/dictionary";
import type { SocialConnectionPublic, SocialPlatform } from "@/features/shared/types";

/** Localized display-name key per platform — also reused by ConnectionsPage for toasts. */
export const PLATFORM_NAME_KEY: Record<SocialPlatform, DictKey> = {
  facebook: "connections.platform.facebook",
  instagram: "connections.platform.instagram",
  tiktok: "connections.platform.tiktok",
  whatsapp: "connections.platform.whatsapp",
};

const PLATFORM_ACCENT: Record<SocialPlatform, string> = {
  facebook: "bg-[#1877F2]",
  instagram: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
  tiktok: "bg-[#111111]",
  whatsapp: "bg-[#25D366]",
};

interface PlatformCardProps {
  platform: SocialPlatform;
  connection?: SocialConnectionPublic;
  isPending: boolean;
  onConnect: (platform: SocialPlatform) => void;
  onDisconnect: (platform: SocialPlatform) => void;
}

export function PlatformCard({
  platform,
  connection,
  isPending,
  onConnect,
  onDisconnect,
}: PlatformCardProps) {
  const { t } = useLocale();
  const status = connection?.status ?? "disconnected";
  const isConnected = status === "connected";
  const isConfigured = connection?.is_configured ?? false;

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-surface p-5 neu-raised">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${PLATFORM_ACCENT[platform]}`}
        >
          <PlatformIcon platform={platform} className="h-5 w-5" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-text-primary">
            {t(PLATFORM_NAME_KEY[platform])}
          </span>
          <span className={`w-fit text-xs ${isConnected ? "text-success" : "text-text-muted"}`}>
            {isConnected ? t("connections.connectedStatus") : t("connections.notConnected")}
          </span>
        </div>
      </div>

      {!isConfigured && (
        <span className="w-fit rounded-lg px-2 py-1 text-xs text-text-muted neu-pressed-sm">
          {t("connections.demoMode")}
        </span>
      )}

      {isConnected ? (
        <div className="flex flex-col gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {connection?.avatar_url ? (
              <Image
                src={connection.avatar_url}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-sm font-semibold text-text-muted neu-pressed-sm">
                {(connection?.account_name ?? "?").replace("@", "").charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate text-sm text-text-primary">
              {t("connections.connectedAs").replace("{handle}", connection?.account_name ?? "")}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onDisconnect(platform)}
            disabled={isPending}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-danger transition-all neu-raised-sm hover:neu-pressed-sm disabled:opacity-50"
          >
            {t("connections.disconnect")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onConnect(platform)}
          disabled={isPending}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-all neu-btn disabled:opacity-50"
        >
          {isPending ? t("connections.connecting") : t("connections.connect")}
        </button>
      )}
    </div>
  );
}

function PlatformIcon({ platform, className }: { platform: SocialPlatform; className?: string }) {
  switch (platform) {
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
        </svg>
      );
    case "instagram":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className={className}
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M16.5 2h-3v13.5a2.75 2.75 0 1 1-2.32-2.72v-3.05a5.78 5.78 0 1 0 5.32 5.77V8.9a7.16 7.16 0 0 0 4.5 1.58V7.46A4.28 4.28 0 0 1 16.5 3.2Z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12.01 2C6.49 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.53 2 12.01 2Zm0 18.13c-1.66 0-3.2-.46-4.53-1.26l-.32-.19-3 .79.8-2.93-.21-.3A8.07 8.07 0 0 1 3.87 12c0-4.48 3.65-8.13 8.14-8.13 4.48 0 8.13 3.65 8.13 8.13 0 4.49-3.65 8.13-8.13 8.13Zm4.44-6.1c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.53.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.42-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02s.87 2.35.99 2.51c.12.16 1.71 2.61 4.15 3.66.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
        </svg>
      );
    default:
      return null;
  }
}
