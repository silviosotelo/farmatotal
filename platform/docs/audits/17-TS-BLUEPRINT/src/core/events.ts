export interface DomainEvent<TPayload = unknown> {
  readonly id: string;
  readonly type: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly occurredAt: Date;
  readonly payload: TPayload;
}

export interface EventBus {
  publish(events: readonly DomainEvent[]): Promise<void>;
}

export interface Outbox {
  append(events: readonly DomainEvent[]): Promise<void>;
}
