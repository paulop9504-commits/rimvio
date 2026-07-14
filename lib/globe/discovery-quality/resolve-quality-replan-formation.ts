import type { RimvioEngineId } from "@/lib/engine/engine-types";
import { resolveEngineHandoffSeed } from "@/lib/context-execution/build-plan-step-handoff";
import { resolveScoutRecoverySeed } from "@/lib/globe/domain-cues/resolve-scout-recovery-seed";

/**
 * When scout is thin — alternate teammate before widening the same engine again.
 * Same-engine widen is attempt 1; this formation is attempt 2+.
 */
export const SCOUT_QUALITY_REPLAN_FORMATIONATION: Readonly<
  Partial<Record<RimvioEngineId, RimvioEngineId>>
> = {
  lodging_search: "eatery_search",
  eatery_search: "activity_search",
  activity_search: "local_amenity_search",
  local_amenity_search: "eatery_search",
  trip_experience_search: "lodging_search",
};

export type QualityReplanPlan = {
  readonly toEngineId: RimvioEngineId;
  readonly seedUtterance: string;
  readonly mode: "widen_same" | "alternate_engine";
  readonly hintKo: string;
};

/**
 * Attempt 0→1: widen same engine. Attempt 1→2: alternate formation engine.
 */
export function resolveQualityReplanFormation(input: {
  fromEngineId: RimvioEngineId;
  contextEventId: string;
  attemptsUsedAfterBump: number;
  seedUtterance?: string | null;
}): QualityReplanPlan {
  if (input.attemptsUsedAfterBump <= 1) {
    const seed = resolveScoutRecoverySeed({
      contextEventId: input.contextEventId,
      engineId: input.fromEngineId,
      seedUtterance: input.seedUtterance,
    });
    return {
      toEngineId: input.fromEngineId,
      seedUtterance: seed,
      mode: "widen_same",
      hintKo: "범위를 넓혀 다시 찾는 중이에요…",
    };
  }

  const alternate =
    SCOUT_QUALITY_REPLAN_FORMATIONATION[input.fromEngineId] ?? input.fromEngineId;
  const handoff = resolveEngineHandoffSeed(alternate);
  const seed =
    handoff?.seedUtterance ??
    resolveScoutRecoverySeed({
      contextEventId: input.contextEventId,
      engineId: alternate,
      seedUtterance: input.seedUtterance,
    });
  return {
    toEngineId: alternate,
    seedUtterance: seed,
    mode: "alternate_engine",
    hintKo:
      handoff?.hintKo ??
      "다른 엔진으로 조합해 다시 찾아보는 중이에요…",
  };
}
