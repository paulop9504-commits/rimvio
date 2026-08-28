/**
 * Rimvio event naming — domain.entity.verb
 * docs/RIMVIO_OS_CONSTITUTION.md §10
 */

export const RIMVIO_EVENT_PATTERN = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

export type RimvioPlatformEvent = {
  readonly name: string;
  readonly sourcePlatformId: string;
  readonly payloadSchema: string;
  readonly atIso: string;
};

export function isValidRimvioEventName(name: string): boolean {
  return RIMVIO_EVENT_PATTERN.test(name.trim());
}

export const RIMVIO_CANONICAL_EVENTS = [
  "listing.created",
  "listing.updated",
  "order.created",
  "payment.completed",
  "message.received",
  "user.joined",
  "review.created",
] as const;

export type RimvioCanonicalEvent = (typeof RIMVIO_CANONICAL_EVENTS)[number];
