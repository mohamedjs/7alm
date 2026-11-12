"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { DictKey } from "@/features/i18n/dictionary";
import type { InboxThread } from "@/features/shared/types";
import { ChannelBadge } from "./ChannelBadge";

interface Props {
  thread: InboxThread | undefined;
  isLoading: boolean;
  window: { key: DictKey; canSend: boolean } | null;
  draft: string;
  onDraft: (v: string) => void;
  onSend: () => void;
  isSending: boolean;
  sendError: string | null;
  onToggleClosed: () => void;
}

export function ConversationThread({ thread, isLoading, window, draft, onDraft, onSend, isSending, sendError, onToggleClosed }: Props) {
  const { t, locale } = useLocale();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages.length]);

  if (!thread) {
    return <div className="flex h-full min-h-80 items-center justify-center p-8 text-center text-text-muted">{isLoading ? "…" : t("inbox.pick")}</div>;
  }
  const name = thread.contact.name || thread.contact.username || t("inbox.unknownContact");
  return (
    <div className="flex h-full min-h-[32rem] flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-bold text-text-primary">{name}</h2>
            <ChannelBadge channel={thread.channel} withLabel />
          </div>
          {thread.contact.customer && (
            <Link href={`/admin/customers?customer=${thread.contact.customer.id}`} className="text-sm text-brand-600 hover:underline">
              {t("inbox.customer")}: {thread.contact.customer.full_name} · {thread.contact.customer.phone}
            </Link>
          )}
        </div>
        <button type="button" onClick={onToggleClosed} className="neu-raised rounded-xl bg-surface px-3 py-1.5 text-sm text-text-muted hover:text-text-primary">
          {thread.status === "open" ? t("inbox.close") : t("inbox.reopen")}
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4" role="log" aria-live="polite">
        {thread.messages.map((m) => {
          const out = m.direction === "outbound";
          return (
            <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm ${out ? "bg-brand-500 text-white" : "neu-raised bg-surface text-text-primary"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body ?? `[${m.type}]`}</p>
                <p className={`mt-1 text-[11px] ${out ? "text-white/75" : "text-text-muted"}`}>
                  {new Date(m.sent_at).toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
                  {out && ` · ${t(`inbox.status.${m.status === "received" ? "delivered" : m.status}` as DictKey)}`}
                </p>
                {m.status === "failed" && m.error && <p className="mt-1 text-[11px] font-medium text-red-100">{m.error}</p>}
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>

      <footer className="border-t border-border p-4">
        {window && <p className={`mb-2 text-xs ${window.canSend ? "text-text-muted" : "text-red-500"}`}>{t(window.key)}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            rows={2}
            disabled={!window?.canSend}
            placeholder={t("inbox.compose")}
            className="neu-pressed min-h-12 flex-1 resize-none rounded-2xl bg-surface px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isSending || !window?.canSend}
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-brand-500 px-4 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
            {isSending ? t("inbox.sending") : t("inbox.send")}
          </button>
        </form>
        {sendError && <p className="mt-2 text-sm text-red-500">{sendError}</p>}
      </footer>
    </div>
  );
}
