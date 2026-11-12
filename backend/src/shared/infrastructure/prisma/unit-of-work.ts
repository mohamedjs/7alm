import { Injectable } from "@nestjs/common";
import type { DomainEvent } from "../../domain/domain-event";
import type { UnitOfWork } from "../../application/unit-of-work.port";
import { PrismaService, type Db } from "./prisma.service";

function toOutboxRows(events: DomainEvent[]) {
  return events.map((e) => ({
    topic: e.topic,
    key: e.key,
    type: e.type,
    payload: e.payload as object,
  }));
}

/**
 * Prisma implementation of the unit of work: the work and its outbox rows
 * commit together, so an event exists if and only if the change happened.
 */
@Injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async run<T>(work: (tx: unknown) => Promise<{ result: T; events?: DomainEvent[] }>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const { result, events } = await work(tx);
      if (events && events.length > 0) {
        await tx.outboxEvent.createMany({ data: toOutboxRows(events) });
      }
      return result;
    });
  }

  async publish(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    await this.prisma.outboxEvent.createMany({ data: toOutboxRows(events) });
  }
}

/** Use the transaction client when a use case passes one, else the root client. */
export function dbOf(prisma: PrismaService, tx?: unknown): Db {
  return (tx as Db | undefined) ?? prisma;
}
