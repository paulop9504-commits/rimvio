import type {
  ContextConditionRecommendation,
  LocalDiscoveryActionSpec,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";

export type SpatialResourceKind = "lodging" | "eatery";

/** What part of the map batch to refresh — Cursor-like partial edit. */
export type SpatialPatchScope = "all" | "lodging_only" | "eatery_only";

export type SpatialPatchPlan = {
  readonly scope: SpatialPatchScope;
  readonly keepKinds: readonly SpatialResourceKind[];
  readonly replaceKinds: readonly SpatialResourceKind[];
  readonly reasonKo: string;
  readonly nextSpec: LocalDiscoveryActionSpec;
};

export type SpatialPatchPreview = {
  readonly plan: SpatialPatchPlan;
  readonly kept: readonly ContextConditionRecommendation[];
  readonly replacingKinds: readonly SpatialResourceKind[];
};
