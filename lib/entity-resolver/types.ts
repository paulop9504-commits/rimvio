/**
 * Entity Resolver ontology — scout vertical slice.
 * Law: tokens → ResolvedEntity[] before Intent axes.
 */

import type { WorldGeoEntityId } from "@/lib/reality-graph/types";

export type EntityKind =
  | "Brand"
  | "Food"
  | "Drink"
  | "Dessert"
  | "Restaurant"
  | "Hotel"
  | "Airport"
  | "Station"
  | "Museum"
  | "Location"
  | "Product"
  | "Unknown";

export type EntityResolveSource =
  | "dictionary"
  | "reality_graph"
  | "context"
  | "entity_lock";

export type EntityKindCandidate = {
  readonly kind: EntityKind;
  readonly confidence: number;
};

export type ResolvedEntity = {
  readonly id: string;
  readonly kind: EntityKind;
  readonly label: string;
  readonly aliases: readonly string[];
  /** e.g. Brand → RestaurantChain → FastFood → Eatery */
  readonly semanticPath: readonly string[];
  readonly confidence: number;
  readonly source: EntityResolveSource;
  readonly span?: { readonly start: number; readonly end: number };
  readonly geoId?: WorldGeoEntityId;
  readonly lat?: number;
  readonly lng?: number;
  /** Ambiguous kinds when confidence gap is small. */
  readonly candidates?: readonly EntityKindCandidate[];
  /** Catalog query string for scout focus (맥도날드, 말차…). */
  readonly queryFocus?: string;
  /** Near-search hint when modifiers like 근처 attach to Station. */
  readonly nearSearch?: boolean;
};

export type EntityResolveResult = {
  readonly text: string;
  readonly entities: readonly ResolvedEntity[];
  /** Leftover modifiers after entity spans (근처, 찾아줘…). */
  readonly modifiers: readonly string[];
};

export const ENTITY_AMBIGUITY_GAP = 0.08;
