/**
 * Rimvio Protocol — OS object model (constitutional SSOT).
 * docs/RIMVIO_OS_CONSTITUTION.md · ADR-057
 *
 * Not to be confused with Callout `RimvioObject` (UI projection slice).
 */

export const RIMVIO_OS_ENTITY_KINDS = [
  "user",
  "organization",
  "platform",
  "capability",
  "agent",
  "product",
  "listing",
  "order",
  "payment",
  "message",
  "event",
  "task",
  "file",
  "location",
  "market",
  "workflow",
] as const;

export type RimvioOsEntityKind = (typeof RIMVIO_OS_ENTITY_KINDS)[number];

export const RIMVIO_OS_RELATION_KINDS = [
  "owns",
  "contains",
  "belongs_to",
  "creates",
  "operates_in",
  "buyer",
  "seller",
  "member_of",
  "invokes",
  "subscribes",
  "composed_with",
] as const;

export type RimvioOsRelationKind = (typeof RIMVIO_OS_RELATION_KINDS)[number];

export type RimvioOsEntityRef = {
  readonly kind: RimvioOsEntityKind;
  readonly id: string;
};

export type RimvioOsRelation = {
  readonly from: RimvioOsEntityRef;
  readonly kind: RimvioOsRelationKind;
  readonly to: RimvioOsEntityRef;
  readonly metadata?: Readonly<Record<string, string>>;
};

/** Minimal object envelope — tenant-scoped instances extend this. */
export type RimvioOsObject = {
  readonly kind: RimvioOsEntityKind;
  readonly id: string;
  readonly platformId?: string | null;
  readonly ownerUserId?: string | null;
  readonly organizationId?: string | null;
  readonly marketCountry?: string | null;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
};

/** Canonical edges for platform worldview documentation + graph compilers. */
export const RIMVIO_OS_CANONICAL_RELATIONS: readonly RimvioOsRelation[] = [
  {
    from: { kind: "user", id: "*" },
    kind: "owns",
    to: { kind: "platform", id: "*" },
  },
  {
    from: { kind: "organization", id: "*" },
    kind: "owns",
    to: { kind: "platform", id: "*" },
  },
  {
    from: { kind: "platform", id: "*" },
    kind: "contains",
    to: { kind: "capability", id: "*" },
  },
  {
    from: { kind: "platform", id: "*" },
    kind: "operates_in",
    to: { kind: "market", id: "*" },
  },
  {
    from: { kind: "user", id: "*" },
    kind: "creates",
    to: { kind: "listing", id: "*" },
  },
  {
    from: { kind: "listing", id: "*" },
    kind: "belongs_to",
    to: { kind: "platform", id: "*" },
  },
  {
    from: { kind: "order", id: "*" },
    kind: "buyer",
    to: { kind: "user", id: "*" },
  },
  {
    from: { kind: "order", id: "*" },
    kind: "seller",
    to: { kind: "user", id: "*" },
  },
  {
    from: { kind: "order", id: "*" },
    kind: "belongs_to",
    to: { kind: "platform", id: "*" },
  },
];

export function isRimvioOsEntityKind(value: string): value is RimvioOsEntityKind {
  return (RIMVIO_OS_ENTITY_KINDS as readonly string[]).includes(value);
}

export function entityRef(kind: RimvioOsEntityKind, id: string): RimvioOsEntityRef {
  return { kind, id };
}
