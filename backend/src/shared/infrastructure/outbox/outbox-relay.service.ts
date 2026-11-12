import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { KafkaService } from "../kafka/kafka.service";

interface OutboxRow {
  id: string;
  topic: string;
  key: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: Date;
}

const BATCH = 100;
const IDLE_MS = 300;

/**
 * Worker-side relay: claims unpublished outbox rows with
 * `FOR UPDATE SKIP LOCKED` (safe with several workers), sends them to Kafka,
 * and marks them published in the same transaction. Delivery is
 * at-least-once; every consumer is idempotent.
 */
@Injectable()
export class OutboxRelayService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(OutboxRelayService.name);
  private running = false;
  private loop?: Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaService,
  ) {}

  onApplicationBootstrap() {
    this.running = true;
    this.loop = this.run();
  }

  async onModuleDestroy() {
    this.running = false;
    await this.loop;
  }

  private async run() {
    while (this.running) {
      let sent = 0;
      try {
        sent = await this.relayBatch();
      } catch (err) {
        this.log.error(`relay batch failed: ${err instanceof Error ? err.message : err}`);
      }
      if (sent < BATCH) await new Promise((r) => setTimeout(r, IDLE_MS));
    }
  }

  async relayBatch(): Promise<number> {
    return this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<OutboxRow[]>`
          SELECT id, topic, key, type, payload, created_at
          FROM outbox_events
          WHERE published_at IS NULL AND attempts < 20
          ORDER BY created_at
          LIMIT ${BATCH}
          FOR UPDATE SKIP LOCKED`;
        for (const row of rows) {
          try {
            await this.kafka.send(row.topic, row.key, {
              id: row.id,
              type: row.type,
              key: row.key,
              occurredAt: row.created_at.toISOString(),
              payload: row.payload,
            });
            await tx.outboxEvent.update({ where: { id: row.id }, data: { published_at: new Date() } });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            await tx.outboxEvent.update({
              where: { id: row.id },
              data: { attempts: { increment: 1 }, last_error: message.slice(0, 1000) },
            });
            throw err;
          }
        }
        return rows.length;
      },
      { timeout: 30_000 },
    );
  }
}
