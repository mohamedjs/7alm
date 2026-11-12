"use client";

import { useLocale } from "@/features/i18n/i18n.hooks";
import type { InboxConversation } from "@/features/shared/types";
import { ChannelBadge } from "./ChannelBadge";

interface Props {
  conversations: InboxConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

function when(iso: string | null, locale: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return d.toLocaleString(locale === "ar" ? "ar-EG" : "en-GB", sameDay ? { hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short" });
}

export function ConversationList({ conversations, selectedId, onSelect, isLoading }: Props) {
  const { t, locale } = useLocale();
  if (isLoading) {
    return (
      <ul className="space-y-2" aria-busy>
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="neu-raised h-16 animate-pulse rounded-2xl bg-surface" />
        ))}
      </ul>
    );
  }
  if (conversations.length === 0) return <p className="p-6 text-center text-sm text-text-muted">{t("inbox.empty")}</p>;
  return (
    <ul className="space-y-2">
      {conversations.map((c) => {
        const name = c.contact.name || c.contact.username || c.contact.customer?.full_name || t("inbox.unknownContact");
        const active = c.id === selectedId;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              aria-current={active}
              className={`flex w-full items-center gap-3 rounded-2xl p-3 text-start transition-all ${active ? "neu-pressed bg-surface" : "neu-raised bg-surface hover:-translate-y-px"}`}
            >
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500/15 text-sm font-bold text-brand-600">
                {c.contact.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.contact.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  name.slice(0, 1).toUpperCase()
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold text-text-primary">{name}</span>
                  <ChannelBadge channel={c.channel} />
                </span>
                <span className="block truncate text-sm text-text-muted">{c.last_message_preview}</span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <span className="text-xs text-text-muted">{when(c.last_message_at, locale)}</span>
                {c.unread_count > 0 && <span className="min-w-5 rounded-full bg-brand-500 px-1.5 text-center text-xs font-bold text-white">{c.unread_count}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
