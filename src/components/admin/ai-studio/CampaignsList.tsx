"use client";

import { useState } from "react";
import { Copy, Check, Megaphone } from "lucide-react";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { DictKey } from "@/features/i18n/dictionary";
import type { AdCampaign, AdCampaignPlatform, AdCampaignStatus } from "@/features/shared/types";

const STATUS_KEY: Record<AdCampaignStatus, DictKey> = {
  draft: "aiStudio.status.draft",
  ready: "aiStudio.status.ready",
  published: "aiStudio.status.published",
  archived: "aiStudio.status.archived",
};

const STATUS_CLASS: Record<AdCampaignStatus, string> = {
  draft: "bg-text-muted/10 text-text-muted",
  ready: "bg-warning/10 text-warning",
  published: "bg-success/10 text-success",
  archived: "bg-danger/10 text-danger",
};

const PLATFORM_KEY: Record<AdCampaignPlatform, DictKey> = {
  meta: "aiStudio.platform.meta",
  facebook_instagram: "aiStudio.platform.facebook_instagram",
  whatsapp: "aiStudio.platform.whatsapp",
};

interface CampaignsListProps {
  campaigns: AdCampaign[];
  isLoading: boolean;
  onMarkPublished: (id: string) => Promise<unknown>;
  onArchive: (id: string) => Promise<unknown>;
}

function formatDate(value: string, locale: string): string {
  return new Date(value).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function CopyButton({ text, t }: { text: string; t: (key: DictKey) => string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-text-muted transition-all hover:text-text-primary"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {t(copied ? "aiStudio.action.copied" : "aiStudio.action.copy")}
    </button>
  );
}

export function CampaignsList({
  campaigns,
  isLoading,
  onMarkPublished,
  onArchive,
}: CampaignsListProps) {
  const { t, locale } = useLocale();
  const [activeId, setActiveId] = useState<string | null>(null);

  const handle = async (id: string, action: (id: string) => Promise<unknown>) => {
    setActiveId(id);
    try {
      await action(id);
    } finally {
      setActiveId(null);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">{t("aiStudio.title")}…</div>;
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-12 text-text-muted">
        <Megaphone className="h-12 w-12" />
        <p className="text-lg font-medium">{t("aiStudio.empty")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {campaigns.map((campaign) => {
        const copyText = [campaign.headline, campaign.primary_text, campaign.cta]
          .filter(Boolean)
          .join("\n\n");
        const isMutating = activeId === campaign.id;

        return (
          <div key={campaign.id} className="space-y-3 rounded-2xl bg-surface p-5 neu-raised">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-text-primary">
                  {campaign.name || t("aiStudio.col.name")}
                </p>
                <p className="text-xs text-text-muted">
                  {[campaign.niche, campaign.objective].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[campaign.status]}`}
              >
                {t(STATUS_KEY[campaign.status])}
              </span>
            </div>

            <div className="space-y-1.5 rounded-xl bg-surface-raised p-3 text-sm">
              {campaign.headline && (
                <p className="font-semibold text-text-primary">{campaign.headline}</p>
              )}
              {campaign.primary_text && (
                <p className="whitespace-pre-wrap text-text-muted">{campaign.primary_text}</p>
              )}
              {campaign.cta && <p className="font-medium text-brand-500">{campaign.cta}</p>}
              {copyText && (
                <div className="flex justify-end">
                  <CopyButton text={copyText} t={t} />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
              <span>
                {campaign.platform ? t(PLATFORM_KEY[campaign.platform]) : "—"} ·{" "}
                {formatDate(campaign.created_at, locale)}
              </span>
              <div className="flex items-center gap-2">
                {campaign.status === "ready" && (
                  <button
                    type="button"
                    onClick={() => handle(campaign.id, onMarkPublished)}
                    disabled={isMutating}
                    className="rounded-xl bg-success/10 px-3 py-1.5 text-xs font-medium text-success transition-all neu-raised-sm disabled:opacity-50"
                  >
                    {t("aiStudio.action.markPublished")}
                  </button>
                )}
                {campaign.status !== "archived" && (
                  <button
                    type="button"
                    onClick={() => handle(campaign.id, onArchive)}
                    disabled={isMutating}
                    className="rounded-xl bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger transition-all neu-raised-sm disabled:opacity-50"
                  >
                    {t("aiStudio.action.archive")}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
