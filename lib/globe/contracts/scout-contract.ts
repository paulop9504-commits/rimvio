/**
 * Scout contract gate (B sprint).
 * @see docs/RIMVIO_CONTRACT_SCHEMA.md
 */

import type {
  LocalDiscoveryActionSpec,
  LocalDiscoveryBudget,
  LocalDiscoveryResourceType,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { DiscoveryLensId } from "@/lib/globe/discovery-lens/types";
import type { GlobeResourceReelKind } from "@/lib/globe/resource-reel/types";

export type ScoutContractCategory = LocalDiscoveryResourceType;

export type ScoutContractAnchorRef = {
  readonly scoutId: string;
  readonly placeId: string;
  readonly lat: number;
  readonly lng: number;
  readonly title?: string | null;
};

export type ScoutContractLens = {
  readonly radiusM: number;
  readonly timeIso?: string | null;
  readonly budget?: LocalDiscoveryBudget | null;
  /** Chained scout: POV / search origin locked to prior selected candidate. */
  readonly anchorRef?: ScoutContractAnchorRef | null;
  readonly lensId?: DiscoveryLensId | null;
};

export type ScoutContractOutputRef = {
  /** ≡ ContextConditionLastBatchWire.batchId */
  readonly scoutId: string;
};

export type ScoutContract = {
  readonly contract_type: "scout";
  readonly contractId: string;
  readonly contextEventId: string;
  readonly category: ScoutContractCategory;
  readonly lens: ScoutContractLens;
  readonly sortBy?: string | null;
  readonly count?: number | null;
  readonly outputRef?: ScoutContractOutputRef | null;
  /** Underlying placement-engine spec (no rename). */
  readonly spec: LocalDiscoveryActionSpec;
  readonly chainIndex: number;
  readonly updatedAtIso: string;
};

export function scoutCategoryFromSpec(
  spec: LocalDiscoveryActionSpec,
): ScoutContractCategory {
  const first = spec.resourceTypes[0];
  if (first === "hotel" || first === "activity" || first === "amenity") {
    return first;
  }
  return "restaurant";
}

export function scoutCategoryToReelKind(
  category: ScoutContractCategory,
): GlobeResourceReelKind {
  switch (category) {
    case "hotel":
      return "lodging";
    case "activity":
      return "activity";
    case "amenity":
      return "amenity";
    case "restaurant":
      return "eatery";
  }
}

export function reelKindAllowedForCategory(
  category: ScoutContractCategory,
  kind: GlobeResourceReelKind,
): boolean {
  return scoutCategoryToReelKind(category) === kind;
}

export function buildScoutContractId(input: {
  contextEventId: string;
  chainIndex: number;
  atIso?: string;
}): string {
  const at = input.atIso ?? new Date().toISOString();
  return `scout:${input.contextEventId}:${input.chainIndex}:${at}`;
}

/** Spec → ScoutContract wrap (preserves LocalDiscoveryActionSpec). */
export function wrapScoutContract(input: {
  contextEventId: string;
  spec: LocalDiscoveryActionSpec;
  chainIndex?: number;
  anchorRef?: ScoutContractAnchorRef | null;
  lensId?: DiscoveryLensId | null;
  outputRef?: ScoutContractOutputRef | null;
  contractId?: string;
  updatedAtIso?: string;
}): ScoutContract {
  const chainIndex = input.chainIndex ?? 0;
  const updatedAtIso = input.updatedAtIso ?? new Date().toISOString();
  return {
    contract_type: "scout",
    contractId:
      input.contractId ??
      buildScoutContractId({
        contextEventId: input.contextEventId,
        chainIndex,
        atIso: updatedAtIso,
      }),
    contextEventId: input.contextEventId,
    category: scoutCategoryFromSpec(input.spec),
    lens: {
      radiusM: input.spec.radiusM,
      budget: input.spec.budget,
      anchorRef: input.anchorRef ?? null,
      lensId: input.lensId ?? null,
      timeIso: null,
    },
    sortBy: null,
    count: null,
    outputRef: input.outputRef ?? null,
    spec: input.spec,
    chainIndex,
    updatedAtIso,
  };
}

export function scoutContractToSpec(contract: ScoutContract): LocalDiscoveryActionSpec {
  return contract.spec;
}

export function withScoutOutputRef(
  contract: ScoutContract,
  scoutId: string,
): ScoutContract {
  return {
    ...contract,
    outputRef: { scoutId },
    updatedAtIso: new Date().toISOString(),
  };
}

export function withScoutAnchorRef(
  contract: ScoutContract,
  anchorRef: ScoutContractAnchorRef | null,
): ScoutContract {
  return {
    ...contract,
    lens: {
      ...contract.lens,
      anchorRef,
    },
    updatedAtIso: new Date().toISOString(),
  };
}
