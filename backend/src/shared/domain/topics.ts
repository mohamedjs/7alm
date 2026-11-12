/** Kafka topic names. One `<module>.events` topic per publishing module, plus command topics. */
export const Topics = {
  orderingEvents: "ordering.events",
  catalogEvents: "catalog.events",
  messagingEvents: "messaging.events",
  shippingEvents: "shipping.events",
  metaWebhookReceived: "meta.webhook.received",
  messagingReplyRequested: "messaging.reply.requested",
} as const;

export const ALL_TOPICS = Object.values(Topics);
export const dlq = (topic: string) => `${topic}.dlq`;
