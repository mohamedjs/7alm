"use client";

import { Camera, MessageCircle, MessagesSquare, ThumbsUp } from "lucide-react";
import { useLocale } from "@/features/i18n/i18n.hooks";
import type { CommentPlatform, InboxChannel } from "@/features/shared/types";

const STYLE: Record<InboxChannel | CommentPlatform, { icon: typeof MessageCircle; cls: string }> = {
  messenger: { icon: MessagesSquare, cls: "bg-blue-500/10 text-blue-500" },
  facebook: { icon: ThumbsUp, cls: "bg-blue-600/10 text-blue-600" },
  instagram: { icon: Camera, cls: "bg-pink-500/10 text-pink-500" },
  whatsapp: { icon: MessageCircle, cls: "bg-green-500/10 text-green-600" },
};

export function ChannelBadge({ channel, withLabel = false }: { channel: InboxChannel | CommentPlatform; withLabel?: boolean }) {
  const { t } = useLocale();
  const { icon: Icon, cls } = STYLE[channel];
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold ${cls}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {withLabel ? t(`inbox.channel.${channel}`) : <span className="sr-only">{t(`inbox.channel.${channel}`)}</span>}
    </span>
  );
}
