/**
 * A fact that happened inside a module. Events are written to the
 * transactional outbox together with the state change and relayed to Kafka,
 * so other modules react without calling each other directly.
 */
export interface DomainEvent<TPayload = Record<string, unknown>> {
  /** Kafka topic, `<module>.events` for facts or a command topic. */
  readonly topic: string;
  /** Partition key — keeps events for one aggregate in order. */
  readonly key: string;
  /** Stable event name, e.g. `ordering.order.placed`. */
  readonly type: string;
  readonly payload: TPayload;
}

export interface EventEnvelope<TPayload = Record<string, unknown>> {
  id: string;
  type: string;
  key: string;
  occurredAt: string;
  payload: TPayload;
}

/** Base for aggregates that record events while their methods run. */
export abstract class AggregateRoot {
  private readonly pending: DomainEvent[] = [];

  protected record(event: DomainEvent): void {
    this.pending.push(event);
  }

  pullEvents(): DomainEvent[] {
    return this.pending.splice(0, this.pending.length);
  }
}
