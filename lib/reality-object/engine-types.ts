/**
 * Reality Object Engine model — mutable object state machine (Reality OS).
 * Distinct from RealityObjectV1 (durable place/media identity on events).
 */

export type RealityObjectState =
  | "discovered"
  | "shortlisted"
  | "preparing"
  | "committed"
  | "active"
  | "completed"
  | "archived";

export type CommitHistoryEntry = {
  readonly commitId: string;
  readonly action: string;
  readonly resultKo: string;
  readonly committedAt: string;
  readonly reversible: boolean;
};

export type RealityObjectRelationship = {
  readonly targetObjectId: string;
  readonly kind:
    | "belongs_to"
    | "depends_on"
    | "conflicts_with"
    | "satisfies"
    | "near"
    | "alternative";
};

export type RealityObject = {
  readonly objectId: string;
  readonly entityId: string;
  readonly contextId: string;
  readonly kind: string;
  readonly labelKo: string;
  readonly state: RealityObjectState;
  readonly relationships: readonly RealityObjectRelationship[];
  readonly availableActions: readonly string[];
  readonly commitHistory: readonly CommitHistoryEntry[];
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export const REALITY_OBJECT_TRANSITIONS: Record<
  RealityObjectState,
  readonly RealityObjectState[]
> = {
  discovered: ["shortlisted", "archived"],
  shortlisted: ["preparing", "discovered", "archived"],
  preparing: ["committed", "shortlisted"],
  committed: ["active", "archived"],
  active: ["completed", "archived"],
  completed: ["archived"],
  archived: ["discovered"],
};
