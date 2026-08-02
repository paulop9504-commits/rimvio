/**
 * Reality Graph — Entity model (not place-search inventory).
 * Workspace holds Entity references; never copies Entity payloads as SSOT.
 */

export const REALITY_ENTITY_TYPES = [
  "Hotel",
  "Flight",
  "Restaurant",
  "Place",
  "Event",
  "Route",
  "Person",
  "Payment",
  "Memory",
] as const;

export type RealityEntityType = (typeof REALITY_ENTITY_TYPES)[number];

export type RealityEntityId = string;

export type RealityEntityState = {
  readonly lifecycle?:
    | "discovered"
    | "candidate"
    | "compared"
    | "selected"
    | "prepared"
    | "committed"
    | "archived";
  readonly active?: boolean;
  readonly [key: string]: unknown;
};

/**
 * Reality Entity — graph node SSOT.
 * Relations are stored in the graph edge index; `relations` on the entity
 * is a denormalized id list for quick adjacency (ids only, not copies).
 */
export type RealityEntity = {
  readonly id: RealityEntityId;
  readonly type: RealityEntityType;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly state: RealityEntityState;
  /** Adjacent relation edge ids — not embedded Relation copies as source of truth */
  readonly relationIds: readonly string[];
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
};

/** Map Workspace / lodging kinds → RealityEntityType */
export function workspaceKindToEntityType(
  kind: string,
): RealityEntityType {
  const k = kind.toLowerCase();
  if (k === "hotel" || k === "lodging") return "Hotel";
  if (k === "restaurant" || k === "eatery") return "Restaurant";
  if (k === "flight") return "Flight";
  if (k === "event") return "Event";
  if (k === "route") return "Route";
  if (k === "person" || k === "peer") return "Person";
  if (k === "payment") return "Payment";
  if (k === "memory") return "Memory";
  return "Place";
}
