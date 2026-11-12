import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Kafka, logLevel, type Consumer, type Producer } from "kafkajs";
import { ENV } from "../config/config.module";
import type { Env } from "../config/env";
import type { EventEnvelope } from "../../domain/domain-event";
import { ALL_TOPICS, dlq } from "../../domain/topics";

export interface ConsumerSpec {
  groupId: string;
  topics: string[];
  handle(envelope: EventEnvelope, topic: string): Promise<void>;
}

const MAX_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Thin KafkaJS wrapper used only by the worker process: producer for the
 * outbox relay, idempotent topic creation, and consumers with bounded
 * retries that park poison messages on `<topic>.dlq`.
 */
@Injectable()
export class KafkaService implements OnModuleDestroy {
  private readonly log = new Logger(KafkaService.name);
  private readonly kafka: Kafka;
  private producer?: Producer;
  private readonly consumers: Consumer[] = [];

  constructor(@Inject(ENV) env: Env) {
    this.kafka = new Kafka({
      clientId: env.KAFKA_CLIENT_ID,
      brokers: env.KAFKA_BROKERS.split(",").map((b) => b.trim()),
      logLevel: logLevel.WARN,
      retry: { retries: 8, initialRetryTime: 300 },
    });
  }

  async ensureTopics(): Promise<void> {
    const admin = this.kafka.admin();
    await admin.connect();
    try {
      const existing = new Set(await admin.listTopics());
      const wanted = ALL_TOPICS.flatMap((t) => [t, dlq(t)]).filter((t) => !existing.has(t));
      if (wanted.length) {
        await admin.createTopics({
          waitForLeaders: true,
          topics: wanted.map((topic) => ({ topic, numPartitions: 3, replicationFactor: 1 })),
        });
        this.log.log(`created topics: ${wanted.join(", ")}`);
      }
    } finally {
      await admin.disconnect();
    }
  }

  async getProducer(): Promise<Producer> {
    if (!this.producer) {
      this.producer = this.kafka.producer({ idempotent: true, maxInFlightRequests: 1 });
      await this.producer.connect();
    }
    return this.producer;
  }

  async send(topic: string, key: string, envelope: EventEnvelope): Promise<void> {
    const producer = await this.getProducer();
    await producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(envelope), headers: { type: envelope.type } }],
    });
  }

  async consume(spec: ConsumerSpec): Promise<void> {
    const consumer = this.kafka.consumer({ groupId: spec.groupId });
    this.consumers.push(consumer);
    await consumer.connect();
    for (const topic of spec.topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
    }
    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        if (!message.value) return;
        let envelope: EventEnvelope;
        try {
          envelope = JSON.parse(message.value.toString()) as EventEnvelope;
        } catch {
          this.log.error(`[${spec.groupId}] unparseable message on ${topic}, sending to DLQ`);
          await this.toDlq(topic, message.key?.toString() ?? "", message.value.toString(), "unparseable");
          return;
        }
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            await spec.handle(envelope, topic);
            return;
          } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            if (attempt === MAX_ATTEMPTS) {
              this.log.error(`[${spec.groupId}] ${envelope.type} failed ${attempt}x: ${reason} → DLQ`);
              await this.toDlq(topic, envelope.key, JSON.stringify(envelope), reason);
              return;
            }
            this.log.warn(`[${spec.groupId}] ${envelope.type} attempt ${attempt} failed: ${reason}`);
            await sleep(250 * 2 ** attempt);
          }
        }
      },
    });
    this.log.log(`consumer ${spec.groupId} listening on ${spec.topics.join(", ")}`);
  }

  private async toDlq(topic: string, key: string, value: string, reason: string) {
    const producer = await this.getProducer();
    await producer.send({
      topic: dlq(topic),
      messages: [{ key, value, headers: { reason: reason.slice(0, 500) } }],
    });
  }

  async ping(): Promise<boolean> {
    const admin = this.kafka.admin();
    try {
      await admin.connect();
      await admin.listTopics();
      return true;
    } catch {
      return false;
    } finally {
      await admin.disconnect().catch(() => undefined);
    }
  }

  async onModuleDestroy() {
    await Promise.allSettled(this.consumers.map((c) => c.disconnect()));
    await this.producer?.disconnect().catch(() => undefined);
  }
}
