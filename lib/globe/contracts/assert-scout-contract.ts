/**
 * Scout contract violation checks (B sprint subset).
 * @see docs/RIMVIO_CONTRACT_SCHEMA.md §6
 */

import type { ScoutContract } from "@/lib/globe/contracts/scout-contract";
import {
  reelKindAllowedForCategory,
  scoutCategoryFromSpec,
  scoutCategoryToReelKind,
} from "@/lib/globe/contracts/scout-contract";
import type { GlobeResourceReelKind } from "@/lib/globe/resource-reel/types";

export type ScoutContractViolationCode =
  | "category_contamination"
  | "dangling_anchor_ref"
  | "ssot_fork";

export type ScoutContractViolation = {
  readonly code: ScoutContractViolationCode;
  readonly messageKo: string;
};

export type ScoutContractAssertResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly violations: readonly ScoutContractViolation[] };

const CONTAMINATION_KO =
  "찾아본 종류와 다른 후보가 섞였어요. 다시 찾아볼게요.";
const DANGLING_ANCHOR_KO =
  "이어서 볼 기준 장소가 비어 있어요. 먼저 후보를 고른 뒤 다시 말해주세요.";
const SSOT_FORK_KO =
  "목록이 방금 찾은 결과와 어긋났어요. 다시 맞춰 볼게요.";

/** Allow kinds that match any resourceType on the contract spec (not only primary category). */
export function reelKindAllowedForContract(
  contract: ScoutContract,
  kind: GlobeResourceReelKind,
): boolean {
  const types = contract.spec.resourceTypes;
  if (types.length > 1) {
    return types.some((resourceType) => {
      const category =
        resourceType === "hotel" ||
        resourceType === "activity" ||
        resourceType === "amenity"
          ? resourceType
          : "restaurant";
      return scoutCategoryToReelKind(category) === kind;
    });
  }
  return reelKindAllowedForCategory(contract.category, kind);
}

export function assertScoutOutputKinds(input: {
  contract: ScoutContract;
  kinds: readonly GlobeResourceReelKind[];
}): ScoutContractAssertResult {
  const bad = input.kinds.filter(
    (kind) => !reelKindAllowedForContract(input.contract, kind),
  );
  if (bad.length === 0) {
    return { ok: true };
  }
  return {
    ok: false,
    violations: [
      {
        code: "category_contamination",
        messageKo: CONTAMINATION_KO,
      },
    ],
  };
}

/** chainIndex >= 1 must carry a resolvable anchor_ref. */
export function assertScoutAnchorRef(
  contract: ScoutContract,
): ScoutContractAssertResult {
  if (contract.chainIndex < 1) {
    return { ok: true };
  }
  const anchor = contract.lens.anchorRef;
  if (
    !anchor ||
    !anchor.placeId.trim() ||
    !anchor.scoutId.trim() ||
    !Number.isFinite(anchor.lat) ||
    !Number.isFinite(anchor.lng)
  ) {
    return {
      ok: false,
      violations: [
        {
          code: "dangling_anchor_ref",
          messageKo: DANGLING_ANCHOR_KO,
        },
      ],
    };
  }
  return { ok: true };
}

export function assertScoutReelSource(input: {
  contract: ScoutContract;
  itemSources: readonly {
    sourceKind: "batch" | "lens" | "inventory" | "unknown";
    sourceId?: string | null;
  }[];
}): ScoutContractAssertResult {
  const expectedBatch = input.contract.outputRef?.scoutId?.trim() || null;
  const expectedLens = input.contract.lens.lensId ?? null;
  for (const row of input.itemSources) {
    if (row.sourceKind === "inventory" || row.sourceKind === "unknown") {
      return {
        ok: false,
        violations: [{ code: "ssot_fork", messageKo: SSOT_FORK_KO }],
      };
    }
    if (row.sourceKind === "batch") {
      if (expectedBatch && row.sourceId && row.sourceId !== expectedBatch) {
        return {
          ok: false,
          violations: [{ code: "ssot_fork", messageKo: SSOT_FORK_KO }],
        };
      }
    }
    if (row.sourceKind === "lens") {
      if (expectedLens && row.sourceId && row.sourceId !== expectedLens) {
        return {
          ok: false,
          violations: [{ code: "ssot_fork", messageKo: SSOT_FORK_KO }],
        };
      }
    }
  }
  return { ok: true };
}

export function assertScoutContractGate(input: {
  contract: ScoutContract;
  outputKinds?: readonly GlobeResourceReelKind[];
  itemSources?: readonly {
    sourceKind: "batch" | "lens" | "inventory" | "unknown";
    sourceId?: string | null;
  }[];
}): ScoutContractAssertResult {
  const violations: ScoutContractViolation[] = [];
  const anchor = assertScoutAnchorRef(input.contract);
  if (!anchor.ok) {
    violations.push(...anchor.violations);
  }
  if (input.outputKinds && input.outputKinds.length > 0) {
    const kinds = assertScoutOutputKinds({
      contract: input.contract,
      kinds: input.outputKinds,
    });
    if (!kinds.ok) {
      violations.push(...kinds.violations);
    }
  }
  if (input.itemSources && input.itemSources.length > 0) {
    const ssot = assertScoutReelSource({
      contract: input.contract,
      itemSources: input.itemSources,
    });
    if (!ssot.ok) {
      violations.push(...ssot.violations);
    }
  }
  if (violations.length > 0) {
    return { ok: false, violations };
  }
  return { ok: true };
}

export function primaryScoutViolationMessage(
  result: ScoutContractAssertResult,
): string | null {
  if (result.ok) {
    return null;
  }
  return result.violations[0]?.messageKo ?? null;
}

/** Prefer realigning primary category when outcome.spec drifted from stale contract. */
export function shouldRealignScoutContractCategory(
  contract: ScoutContract,
): boolean {
  return scoutCategoryFromSpec(contract.spec) !== contract.category;
}
