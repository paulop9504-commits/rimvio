/**
 * Discovery → Runtime Router selection (delegates to Rimvio Core).
 */

import {
  resolveRuntimeRouterSelection,
} from "@/lib/rimvio-core/runtime-router";
import type { RankedRuntimeCandidate } from "@/lib/rimvio-core/runtime-router-select";
import type { CapabilityDiscoveryPlan } from "@/lib/platform-sdk/discover-capabilities";
import { resolveCapabilityRuntimeRequirements } from "@/lib/platform-sdk/runtime-requirements";

export type CapabilityExecutionResolution = {
  readonly runtime: RankedRuntimeCandidate["runtime"] | null;
  readonly compatible: boolean;
  readonly reasonKo: string;
  readonly requires: readonly string[];
  readonly rankedCandidates: readonly RankedRuntimeCandidate[];
  readonly routerScores: RankedRuntimeCandidate["scores"] | null;
};

export function resolveCapabilityExecution(input: {
  readonly plan: CapabilityDiscoveryPlan;
  readonly utterance?: string;
}): CapabilityExecutionResolution {
  const requirements = resolveCapabilityRuntimeRequirements(input.plan.capabilityId);
  const { selected, candidates } = resolveRuntimeRouterSelection({
    capabilityId: input.plan.capabilityId,
    platformId: input.plan.platformId,
    marketCountry: input.plan.marketCountry,
    utterance: input.utterance,
  });

  if (!selected) {
    return {
      runtime: null,
      compatible: false,
      reasonKo: "호환 Runtime 없음",
      requires: requirements.required,
      rankedCandidates: candidates,
      routerScores: null,
    };
  }

  return {
    runtime: selected.runtime,
    compatible: true,
    reasonKo: `${selected.runtime.name} v${selected.runtime.version} · Router ${(selected.scores.composite * 100).toFixed(0)}%`,
    requires: requirements.required,
    rankedCandidates: candidates,
    routerScores: selected.scores,
  };
}
