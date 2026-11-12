import { Inject, Logger, Module, OnApplicationBootstrap } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { SharedModule } from "./shared/infrastructure/shared.module";
import { loggerOptions } from "./shared/infrastructure/logging";
import { KafkaService } from "./shared/infrastructure/kafka/kafka.service";
import { OutboxRelayService } from "./shared/infrastructure/outbox/outbox-relay.service";
import { REALTIME, type Realtime } from "./shared/application/realtime.port";
import { Topics } from "./shared/domain/topics";
import { NotificationsModule, OrderNotificationsHandler } from "./modules/notifications";
import { DeliverOutbound, MessagingModule, ProcessMetaWebhook } from "./modules/messaging";

/**
 * Background process: relays the outbox to Kafka and runs every consumer.
 * Each consumer group is independent, so a slow e-mail never delays the inbox.
 */
@Module({
  imports: [LoggerModule.forRoot(loggerOptions("worker")), SharedModule, NotificationsModule, MessagingModule],
  providers: [KafkaService, OutboxRelayService],
})
export class WorkerModule implements OnApplicationBootstrap {
  private readonly log = new Logger("Worker");

  constructor(
    private readonly kafka: KafkaService,
    private readonly notifications: OrderNotificationsHandler,
    private readonly ingest: ProcessMetaWebhook,
    private readonly deliver: DeliverOutbound,
    @Inject(REALTIME) private readonly realtime: Realtime,
  ) {}

  async onApplicationBootstrap() {
    await this.kafka.ensureTopics();
    await this.kafka.consume({ groupId: "halm-notifications", topics: [Topics.orderingEvents], handle: (e) => this.notifications.handle(e as never) });
    await this.kafka.consume({ groupId: "halm-meta-ingest", topics: [Topics.metaWebhookReceived], handle: (e) => this.ingest.execute(e) });
    await this.kafka.consume({ groupId: "halm-meta-sender", topics: [Topics.messagingReplyRequested], handle: (e) => this.deliver.execute(e as never) });
    await this.kafka.consume({
      groupId: "halm-realtime",
      topics: [Topics.orderingEvents, Topics.catalogEvents],
      handle: async (e, topic) => {
        this.realtime.toAdmins(topic === Topics.orderingEvents ? "orders:changed" : "catalog:changed", { type: e.type, ...e.payload });
      },
    });
    this.log.log("worker ready");
  }
}
