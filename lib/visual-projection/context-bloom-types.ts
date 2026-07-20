import type { GlobeTripArc } from "@/lib/globe/project-trip-leg-arcs";

/** How two Reality Objects relate — drives line style. */
export type BloomRelationKind =
  | "travel"
  | "recommend"
  | "booking_order"
  | "visited";

export type ContextBloomRole = "selected" | "related" | "none";

export type ContextBloomCandidate = {
  readonly id: string;
  readonly resourceId: string;
  readonly label: string;
  readonly lat: number;
  readonly lng: number;
  readonly pinKind: "eatery" | "lodging" | "activity" | "amenity";
  readonly placeId?: string | null;
};

export type ContextBloomRelatedHit = {
  readonly id: string;
  readonly resourceId: string;
  readonly label: string;
  readonly lat: number;
  readonly lng: number;
  readonly pinKind: "eatery" | "lodging" | "activity" | "amenity";
  readonly score: number;
  readonly relationKind: BloomRelationKind;
  /** Stagger delay for Bloom pulse (ms). */
  readonly bloomDelayMs: number;
};

export type ContextBloomSession = {
  readonly selected: ContextBloomCandidate;
  readonly related: readonly ContextBloomRelatedHit[];
  readonly arcs: readonly GlobeTripArc[];
  readonly startedAtMs: number;
  /** Arcs clear after this timestamp; glow may remain. */
  readonly arcsUntilMs: number;
  /** Bloom sequence phase — Execution CTAs at execution_ready. */
  readonly phase?:
    | "idle"
    | "glowing"
    | "arcs"
    | "related_bloom"
    | "execution_ready";
};

export type ContextBloomMarkerDecor = {
  readonly bloomRole: ContextBloomRole;
  readonly bloomDelayMs: number;
  readonly bloomRelationKind?: BloomRelationKind | null;
};
