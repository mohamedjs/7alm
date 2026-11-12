"use client";

import { useState } from "react";
import { EyeOff, Eye, ExternalLink, Check } from "lucide-react";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { SocialComment } from "@/features/shared/types";
import { ChannelBadge } from "./ChannelBadge";

interface Props {
  comments: SocialComment[];
  isLoading: boolean;
  drafts: Record<string, string>;
  onDraft: (id: string, v: string) => void;
  onReply: (c: SocialComment, kind: "public" | "private") => void;
  onToggleHidden: (c: SocialComment) => void;
  onMarkDone: (c: SocialComment) => void;
  isReplying: boolean;
  replyError: string | null;
}

const SEVEN_DAYS = 7 * 24 * 3600_000;

export function CommentsPanel({ comments, isLoading, drafts, onDraft, onReply, onToggleHidden, onMarkDone, isReplying, replyError }: Props) {
  const { t, locale } = useLocale();
  const [now] = useState(() => Date.now());
  if (isLoading) return <div className="neu-raised h-40 animate-pulse rounded-2xl bg-surface" aria-busy />;
  if (comments.length === 0) return <p className="p-6 text-center text-sm text-text-muted">{t("inbox.comments.empty")}</p>;

  return (
    <div className="space-y-4">
      {replyError && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-500">{replyError}</p>}
      {comments.map((c) => {
        const canPrivate = !c.private_reply_sent_at && now - new Date(c.commented_at).getTime() < SEVEN_DAYS && !c.replies.some((r) => r.kind === "private" && r.status !== "failed");
        return (
          <article key={c.id} className="neu-raised rounded-2xl bg-surface p-4">
            <header className="mb-2 flex flex-wrap items-center gap-2">
              <ChannelBadge channel={c.platform} withLabel />
              <span className="font-semibold text-text-primary">{c.author_name ?? t("inbox.unknownContact")}</span>
              <span className="text-xs text-text-muted">{new Date(c.commented_at).toLocaleString(locale === "ar" ? "ar-EG" : "en-GB")}</span>
              {c.is_hidden && <span className="rounded-lg bg-gray-500/10 px-2 py-0.5 text-xs text-text-muted">{t("inbox.comments.hidden")}</span>}
              {c.private_reply_sent_at && <span className="rounded-lg bg-green-500/10 px-2 py-0.5 text-xs text-green-600">{t("inbox.comments.privateSent")}</span>}
              <span className="ms-auto flex items-center gap-1">
                {c.permalink && (
                  <a href={c.permalink} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-text-muted hover:text-text-primary" title={t("inbox.comments.viewPost")}>
                    <ExternalLink className="h-4 w-4" aria-hidden />
                    <span className="sr-only">{t("inbox.comments.viewPost")}</span>
                  </a>
                )}
                <button type="button" onClick={() => onToggleHidden(c)} className="rounded-lg p-1.5 text-text-muted hover:text-text-primary" title={c.is_hidden ? t("inbox.comments.unhide") : t("inbox.comments.hide")}>
                  {c.is_hidden ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
                  <span className="sr-only">{c.is_hidden ? t("inbox.comments.unhide") : t("inbox.comments.hide")}</span>
                </button>
                {c.status === "open" && (
                  <button type="button" onClick={() => onMarkDone(c)} className="rounded-lg p-1.5 text-text-muted hover:text-text-primary" title={t("inbox.comments.markDone")}>
                    <Check className="h-4 w-4" aria-hidden />
                    <span className="sr-only">{t("inbox.comments.markDone")}</span>
                  </button>
                )}
              </span>
            </header>
            <p className="whitespace-pre-wrap text-text-primary">{c.body}</p>

            {c.replies.length > 0 && (
              <ul className="mt-3 space-y-1 border-s-2 border-brand-500/30 ps-3">
                {c.replies.map((r) => (
                  <li key={r.id} className="text-sm text-text-muted">
                    <span className="font-medium">{r.kind === "private" ? t("inbox.comments.replyPrivate") : t("inbox.comments.replyPublic")}:</span> {r.body}{" "}
                    <span className={r.status === "failed" ? "text-red-500" : ""}>· {t(`inbox.status.${r.status}`)}</span>
                    {r.error && <span className="block text-xs text-red-500">{r.error}</span>}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={drafts[c.id] ?? ""}
                onChange={(e) => onDraft(c.id, e.target.value)}
                placeholder={t("inbox.comments.placeholder")}
                className="neu-pressed h-10 flex-1 rounded-xl bg-surface px-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
              <div className="flex gap-2">
                <button type="button" disabled={isReplying || !(drafts[c.id] ?? "").trim()} onClick={() => onReply(c, "public")} className="h-10 rounded-xl bg-brand-500 px-3 text-sm font-semibold text-white disabled:opacity-50">
                  {t("inbox.comments.replyPublic")}
                </button>
                <button type="button" disabled={isReplying || !canPrivate || !(drafts[c.id] ?? "").trim()} onClick={() => onReply(c, "private")} className="neu-raised h-10 rounded-xl bg-surface px-3 text-sm font-semibold text-brand-600 disabled:opacity-50">
                  {t("inbox.comments.replyPrivate")}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
