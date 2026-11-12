import type { DomainEvent } from "../domain/domain-event";

/**
 * Port for "run this work and its events atomically". The Prisma adapter
 * opens a transaction, hands the transaction client to repositories through
 * `tx`, and appends the events to the outbox before committing.
 */
export const UNIT_OF_WORK = Symbol("UNIT_OF_WORK");

export interface UnitOfWork {
  run<T>(work: (tx: unknown) => Promise<{ result: T; events?: DomainEvent[] }>): Promise<T>;
  /** Append events outside an aggregate transaction (still durable). */
  publish(events: DomainEvent[]): Promise<void>;
}
