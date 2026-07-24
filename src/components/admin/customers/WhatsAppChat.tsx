"use client";

import { useEffect, useRef } from "react";
import { Check, CheckCheck, Clock, Send, X } from "lucide-react";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { DictKey } from "@/features/i18n/dictionary";
import type { WhatsAppMessage } from "@/features/shared/types";

/** Props for {@link WhatsAppChat}. */
export interface WhatsAppChatProps {
  messages: WhatsAppMessage[];
  isLoading: boolean;
  isSending: boolean;
  composeText: string;
  onComposeChange: (text: string) => void;
  onSend: () => void;
}

const QUICK_REPLY_KEYS: DictKey[] = [
  "crm.template.shipped",
  "crm.template.thankYou",
  "crm.template.preparing",
  "crm.template.confirmAddress",
];

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function StatusIcon({ status }: { status: WhatsAppMessage["status"] }) {
  switch (status) {
    case "pending":
      return <Clock className="h-3 w-3 text-white/70" />;
    case "sent":
      return <Check className="h-3 w-3 text-white/70" />;
    case "delivered":
      return <CheckCheck className="h-3 w-3 text-white/70" />;
    case "read":
      return <CheckCheck className="h-3 w-3 text-sky-300" />;
    case "failed":
      return <X className="h-3 w-3 text-red-300" />;
    default:
      return null;
  }
}

/**
 * WhatsApp messaging panel for a customer: message history with bubble
 * alignment by direction, quick-reply template chips, and a compose box
 * that sends on Enter (Shift+Enter for a newline).
 */
export function WhatsAppChat({
  messages,
  isLoading,
  isSending,
  composeText,
  onComposeChange,
  onSend,
}: WhatsAppChatProps) {
  const { t } = useLocale();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleTemplateClick = (key: DictKey) => {
    onComposeChange(composeText ? `${composeText} ${t(key)}` : t(key));
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-surface neu-raised">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/20 px-6 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/15 text-green-500">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.71.45 3.38 1.3 4.86L2.05 22l5.36-1.4a9.9 9.9 0 0 0 4.63 1.18h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.13-2.9-7C17.19 3.03 14.7 2 12.04 2Z" />
          </svg>
        </span>
        <h2 className="text-lg font-bold text-text-primary">{t("crm.whatsapp")}</h2>
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex max-h-96 min-h-64 flex-col gap-2 overflow-y-auto px-4 py-4"
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`h-12 w-2/3 animate-pulse rounded-2xl bg-surface-raised ${
                  i % 2 === 0 ? "self-start" : "self-end"
                }`}
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-text-muted">
            {t("crm.noMessages")}
          </div>
        ) : (
          messages.map((message) => {
            const isOutbound = message.direction === "outbound";
            return (
              <div
                key={message.id}
                className={`flex max-w-[75%] flex-col gap-1 rounded-2xl px-3.5 py-2 ${
                  isOutbound
                    ? "self-end bg-brand-500 text-white"
                    : "self-start bg-surface-raised text-text-primary"
                }`}
              >
                <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                <div
                  className={`flex items-center justify-end gap-1 text-[10px] ${
                    isOutbound ? "text-white/70" : "text-text-muted"
                  }`}
                >
                  <span>{formatTime(message.created_at)}</span>
                  {isOutbound && <StatusIcon status={message.status} />}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick replies */}
      <div className="flex gap-2 overflow-x-auto border-t border-border/20 px-4 py-2.5">
        {QUICK_REPLY_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleTemplateClick(key)}
            className="shrink-0 whitespace-nowrap rounded-full bg-surface-raised px-3 py-1.5 text-xs font-medium text-text-primary transition-all neu-raised-sm hover:neu-pressed-sm"
          >
            {t(key)}
          </button>
        ))}
      </div>

      {/* Compose */}
      <div className="flex items-end gap-2 border-t border-border/20 p-4">
        <textarea
          value={composeText}
          onChange={(e) => onComposeChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("crm.composePlaceholder")}
          rows={1}
          className="max-h-24 min-h-[2.5rem] flex-1 resize-none rounded-xl bg-surface px-3 py-2 text-sm text-text-primary neu-input placeholder:text-text-muted"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!composeText.trim() || isSending}
          aria-label={t("crm.sendMessage")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white transition-all neu-btn disabled:opacity-50"
        >
          {isSending ? (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <Send className="h-4 w-4 rtl:-scale-x-100" />
          )}
        </button>
      </div>
    </div>
  );
}
