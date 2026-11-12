import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AdminGuard, CurrentAdmin } from "../../identity";
import { ZodPipe } from "../../../shared/infrastructure/http/zod.pipe";
import type { AppRequest } from "../../../shared/infrastructure/http/request";
import { InboxQueries, ReplyToComment, SendMessage } from "../application/messaging.use-cases";

const TextBody = z.object({ text: z.string().min(1).max(4096) });
const ReplyBody = z.object({ text: z.string().min(1).max(2000), kind: z.enum(["public", "private"]) });
const ConversationStatus = z.object({ status: z.enum(["open", "closed"]) });
const CommentPatch = z.object({ status: z.enum(["open", "done"]).optional(), hidden: z.boolean().optional() });

@Controller("admin/inbox")
@UseGuards(AdminGuard)
export class InboxController {
  constructor(
    private readonly queries: InboxQueries,
    private readonly send: SendMessage,
    private readonly reply: ReplyToComment,
  ) {}

  @Get("counts")
  counts() {
    return this.queries.counts();
  }

  @Get("conversations")
  conversations(@Query("status") status?: string, @Query("channel") channel?: string, @Query("search") search?: string, @Query("limit") limit?: string) {
    return this.queries.conversations({ status: status || undefined, channel: channel || undefined, search: search?.trim() || undefined, limit: Number(limit) || 50 });
  }

  @Get("conversations/:id")
  thread(@Param("id", ParseUUIDPipe) id: string) {
    return this.queries.thread(id);
  }

  @Post("conversations/:id/messages")
  message(@Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(TextBody)) body: z.infer<typeof TextBody>, @CurrentAdmin() admin: AppRequest["admin"]) {
    return this.send.execute(id, body.text, admin!.id);
  }

  @Patch("conversations/:id")
  async status(@Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(ConversationStatus)) body: z.infer<typeof ConversationStatus>) {
    await this.queries.setStatus(id, body.status);
  }

  @Get("comments")
  comments(@Query("platform") platform?: string, @Query("status") status?: string, @Query("limit") limit?: string) {
    return this.queries.comments({ platform: platform || undefined, status: status || undefined, limit: Number(limit) || 50 });
  }

  @Post("comments/:id/replies")
  replyToComment(@Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(ReplyBody)) body: z.infer<typeof ReplyBody>, @CurrentAdmin() admin: AppRequest["admin"]) {
    return this.reply.execute(id, body.kind, body.text, admin!.id);
  }

  @Patch("comments/:id")
  async patchComment(@Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(CommentPatch)) body: z.infer<typeof CommentPatch>) {
    if (body.hidden !== undefined) await this.queries.hideComment(id, body.hidden);
    if (body.status) await this.queries.setCommentStatus(id, body.status);
  }
}
