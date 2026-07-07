import { copy } from "@/lib/copy/human-ko";
import { classifyContextConditionAnchorRequest } from "@/lib/globe/context-condition-ai/classify-context-condition-anchor-request";
import type {
  ContextConditionRecommendation,
  LocalDiscoveryActionSpec,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { refineLocalDiscoverySpec } from "@/lib/globe/context-condition-ai/resolve-local-discovery-action";
import type {
  SpatialPatchPlan,
  SpatialPatchPreview,
  SpatialPatchScope,
  SpatialResourceKind,
} from "@/lib/globe/context-condition-ai/spatial-patch-types";

export type PlanSpatialPatchInput = {
  message: string;
  currentSpec: LocalDiscoveryActionSpec;
  previousRecommendations?: readonly ContextConditionRecommendation[];
  pinnedPlaceIds?: { lodging: string | null; eatery: string | null };
};

function hasBothKinds(
  recommendations: readonly ContextConditionRecommendation[],
): { lodging: boolean; eatery: boolean } {
  return {
    lodging: recommendations.some((row) => row.kind === "lodging"),
    eatery: recommendations.some((row) => row.kind === "eatery"),
  };
}

function parsePatchScope(message: string): SpatialPatchScope | null {
  const text = message.trim();
  if (!text) {
    return null;
  }
  const keepLodging =
    /숙소.*(그대로|유지|안\s*바꿔|그냥|빼고)|숙소는.*두/u.test(text);
  const keepEatery =
    /맛집.*(그대로|유지|안\s*바꿔)|식당.*(그대로|유지)/u.test(text);
  const replaceEatery =
    /맛집.*(바꿔|교체|다시)|식당.*(바꿔|교체|다시)|저녁.*(바꿔|다시)/u.test(
      text,
    );
  const replaceLodging = /숙소.*(바꿔|교체|다시)/u.test(text);
  const eateryOnly =
    /맛집만|식당만|저녁만|음식만|식사만/u.test(text) ||
    (keepLodging && replaceEatery);
  const lodgingOnly = /숙소만|호텔만|잠만/u.test(text) || (keepEatery && replaceLodging);

  if (eateryOnly && !lodgingOnly) {
    return "eatery_only";
  }
  if (lodgingOnly && !eateryOnly) {
    return "lodging_only";
  }
  if (keepLodging && replaceEatery) {
    return "eatery_only";
  }
  if (keepEatery && replaceLodging) {
    return "lodging_only";
  }
  return null;
}

function resolveScope(input: PlanSpatialPatchInput): SpatialPatchScope {
  const explicit = parsePatchScope(input.message);
  if (explicit) {
    return explicit;
  }
  const kinds = hasBothKinds(input.previousRecommendations ?? []);
  const intent = classifyContextConditionAnchorRequest(input.message);
  if (intent.lodgingSimilar && !intent.eateryNearby && kinds.eatery && !kinds.lodging) {
    return "lodging_only";
  }
  if (intent.eateryNearby && !intent.lodgingSimilar && kinds.lodging && !kinds.eatery) {
    return "eatery_only";
  }
  if (kinds.lodging && kinds.eatery) {
    return "all";
  }
  if (kinds.lodging) {
    return "lodging_only";
  }
  if (kinds.eatery) {
    return "eatery_only";
  }
  return "all";
}

function kindsForScope(scope: SpatialPatchScope): {
  keep: SpatialResourceKind[];
  replace: SpatialResourceKind[];
} {
  switch (scope) {
    case "lodging_only":
      return { keep: ["eatery"], replace: ["lodging"] };
    case "eatery_only":
      return { keep: ["lodging"], replace: ["eatery"] };
    case "all":
    default:
      return { keep: [], replace: ["lodging", "eatery"] };
  }
}

function reasonKoForScope(scope: SpatialPatchScope): string {
  switch (scope) {
    case "lodging_only":
      return copy.globe.contextAgentPatchReasonLodging;
    case "eatery_only":
      return copy.globe.contextAgentPatchReasonEatery;
    case "all":
    default:
      return copy.globe.contextAgentPatchReasonAll;
  }
}

function keptRecommendations(input: {
  scope: SpatialPatchScope;
  previousRecommendations: readonly ContextConditionRecommendation[];
  pinnedPlaceIds?: { lodging: string | null; eatery: string | null };
}): ContextConditionRecommendation[] {
  const { keep } = kindsForScope(input.scope);
  if (keep.length === 0) {
    return [];
  }
  const pinned = input.pinnedPlaceIds;
  return input.previousRecommendations.filter((row) => {
    if (!keep.includes(row.kind)) {
      return false;
    }
    if (row.kind === "lodging" && pinned?.lodging) {
      return row.placeId === pinned.lodging;
    }
    if (row.kind === "eatery" && pinned?.eatery) {
      return row.placeId === pinned.eatery;
    }
    return true;
  });
}

/** Natural language + prior batch → partial map patch plan (diff engine). */
export function planSpatialPatch(input: PlanSpatialPatchInput): SpatialPatchPlan {
  const scope = resolveScope(input);
  const { keep, replace } = kindsForScope(scope);
  const nextSpec = refineLocalDiscoverySpec(input.currentSpec, input.message);
  return {
    scope,
    keepKinds: keep,
    replaceKinds: replace,
    reasonKo: reasonKoForScope(scope),
    nextSpec,
  };
}

export function buildSpatialPatchPreview(input: {
  plan: SpatialPatchPlan;
  previousRecommendations: readonly ContextConditionRecommendation[];
  pinnedPlaceIds?: { lodging: string | null; eatery: string | null };
}): SpatialPatchPreview {
  return {
    plan: input.plan,
    kept: keptRecommendations({
      scope: input.plan.scope,
      previousRecommendations: input.previousRecommendations,
      pinnedPlaceIds: input.pinnedPlaceIds,
    }),
    replacingKinds: [...input.plan.replaceKinds],
  };
}
