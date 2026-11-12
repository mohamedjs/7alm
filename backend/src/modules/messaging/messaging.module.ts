import { Module } from "@nestjs/common";
import { ENV } from "../../shared/infrastructure/config/config.module";
import type { Env } from "../../shared/infrastructure/config/env";
import { IdentityModule } from "../identity";
import { CustomersModule } from "../customers";
import { AcceptMetaWebhook, DeliverOutbound, InboxQueries, ProcessMetaWebhook, ReplyToComment, SendMessage } from "./application/messaging.use-cases";
import { INBOX_STORE, META_SENDER } from "./domain/ports";
import { GraphApiClient } from "./infrastructure/graph-api.client";
import { InboxRepository } from "./infrastructure/inbox.repository";
import { MetaCredentials } from "./infrastructure/meta-credentials";
import { InboxController } from "./presentation/inbox.controller";
import { MetaWebhookController } from "./presentation/meta-webhook.controller";

/** Meta inbox: Messenger, Instagram DM, WhatsApp Cloud API, and FB/IG comments. */
@Module({
  imports: [IdentityModule, CustomersModule],
  controllers: [MetaWebhookController, InboxController],
  providers: [
    MetaCredentials,
    GraphApiClient,
    { provide: META_SENDER, useExisting: GraphApiClient },
    { provide: INBOX_STORE, useClass: InboxRepository },
    { provide: "WHATSAPP_TEMPLATE", inject: [ENV], useFactory: (env: Env) => env.META_WHATSAPP_FALLBACK_TEMPLATE },
    { provide: "WHATSAPP_TEMPLATE_LANG", inject: [ENV], useFactory: (env: Env) => env.META_WHATSAPP_TEMPLATE_LANG },
    AcceptMetaWebhook,
    ProcessMetaWebhook,
    SendMessage,
    ReplyToComment,
    DeliverOutbound,
    InboxQueries,
  ],
  exports: [ProcessMetaWebhook, DeliverOutbound, GraphApiClient],
})
export class MessagingModule {}
