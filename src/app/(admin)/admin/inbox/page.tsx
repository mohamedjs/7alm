"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { DictKey } from "@/features/i18n/dictionary";
import { useInboxComments, useInboxMessages } from "@/features/inbox/inbox.hooks";
import { ConversationList } from "@/components/admin/inbox/ConversationList";
import { ConversationThread } from "@/components/admin/inbox/ConversationThread";
import { CommentsPanel } from "@/components/admin/inbox/CommentsPanel";

const pill = (active: boolean) =>
  `rounded-xl px-4 py-2 text-sm font-medium transition-all ${active ? "neu-pressed bg-surface text-brand-500" : "neu-raised bg-surface text-text-muted hover:text-text-primary"}`;

function MessagesTab() {
  const { t } = useLocale();
  const m = useInboxMessages();
  const channels: { value: "" | "messenger" | "instagram" | "whatsapp"; key: DictKey }[] = [
    { value: "", key: "inbox.filter.all" },
    { value: "messenger", key: "inbox.channel.messenger" },
    { value: "instagram", key: "inbox.channel.instagram" },
    { value: "whatsapp", key: "inbox.channel.whatsapp" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {channels.map((c) => (
          <button key={c.key} type="button" aria-pressed={m.filters.channel === c.value} onClick={() => m.filters.setChannel(c.value)} className={pill(m.filters.channel === c.value)}>
            {t(c.key)}
          </button>
        ))}
        <span className="mx-1 h-6 w-px bg-border" aria-hidden />
        {(["open", "closed"] as const).map((s) => (
          <button key={s} type="button" aria-pressed={m.filters.status === s} onClick={() => m.filters.setStatus(s)} className={pill(m.filters.status === s)}>
            {t(`inbox.filter.${s}`)}
          </button>
        ))}
        <span className={`ms-auto inline-flex items-center gap-1.5 text-xs ${m.isLive ? "text-green-600" : "text-text-muted"}`}>
          <span className={`h-2 w-2 rounded-full ${m.isLive ? "bg-green-500" : "bg-gray-400"}`} aria-hidden />
          {m.isLive ? t("inbox.live") : t("inbox.offline")}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(18rem,24rem)_1fr]">
        <aside className="space-y-3">
          <label className="neu-pressed flex items-center gap-2 rounded-xl bg-surface px-3">
            <Search className="h-4 w-4 text-text-muted" aria-hidden />
            <input value={m.filters.search} onChange={(e) => m.filters.setSearch(e.target.value)} placeholder={t("inbox.search")} className="h-10 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted" />
          </label>
          <div className="max-h-[70vh] overflow-y-auto pe-1">
            <ConversationList conversations={m.conversations} selectedId={m.selectedId} onSelect={m.select} isLoading={m.isLoadingList} />
          </div>
        </aside>
        <section className="neu-raised overflow-hidden rounded-3xl bg-surface">
          <ConversationThread
            thread={m.thread}
            isLoading={m.isLoadingThread}
            window={m.window}
            draft={m.draft}
            onDraft={m.setDraft}
            onSend={m.submit}
            isSending={m.isSending}
            sendError={m.sendError}
            onToggleClosed={m.toggleClosed}
          />
        </section>
      </div>
    </div>
  );
}

function CommentsTab() {
  const { t } = useLocale();
  const c = useInboxComments();
  const platforms: { value: "" | "facebook" | "instagram"; key: DictKey }[] = [
    { value: "", key: "inbox.filter.all" },
    { value: "facebook", key: "inbox.channel.facebook" },
    { value: "instagram", key: "inbox.channel.instagram" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {platforms.map((p) => (
          <button key={p.key} type="button" aria-pressed={c.platform === p.value} onClick={() => c.setPlatform(p.value)} className={pill(c.platform === p.value)}>
            {t(p.key)}
          </button>
        ))}
        <span className="mx-1 h-6 w-px bg-border" aria-hidden />
        {(["open", "done"] as const).map((s) => (
          <button key={s} type="button" aria-pressed={c.status === s} onClick={() => c.setStatus(s)} className={pill(c.status === s)}>
            {t(`inbox.comments.${s}`)}
          </button>
        ))}
      </div>
      <CommentsPanel
        comments={c.comments}
        isLoading={c.isLoading}
        drafts={c.drafts}
        onDraft={c.setDraft}
        onReply={c.send}
        onToggleHidden={c.toggleHidden}
        onMarkDone={c.markDone}
        isReplying={c.isReplying}
        replyError={c.replyError}
      />
    </div>
  );
}

export default function AdminInboxPage() {
  const { t } = useLocale();
  const [tab, setTab] = useState<"messages" | "comments">("messages");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t("inbox.title")}</h1>
        <p className="text-text-muted">{t("inbox.subtitle")}</p>
      </div>
      <div role="tablist" className="flex gap-2">
        {(["messages", "comments"] as const).map((k) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={pill(tab === k)}>
            {t(`inbox.tab.${k}`)}
          </button>
        ))}
      </div>
      {tab === "messages" ? <MessagesTab /> : <CommentsTab />}
    </div>
  );
}
