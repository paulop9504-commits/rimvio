/**
 * Runtime Router — Hub Registry selection + execution with fallback (ADR-062).
 */

import type { RimvioRuntimeAction, RimvioRuntimeObservation } from "@/lib/rimvio-core/runtime-protocol";
import {
  rankRuntimesForCapability,
  selectBestRuntimeForCapability,
  type RankedRuntimeCandidate,
  type RuntimeRouterScoreBreakdown,
} from "@/lib/rimvio-core/runtime-router-select";
import {
  mountPlatformHostApis,
  readPlatformHostApis,
} from "@/lib/platform-sdk/platform-host";
import { readRuntimeIndex } from "@/lib/hub/dev/runtime-registry";
import { enforcePaymentCommitPolicy } from "@/lib/hub/dev/compatibility-validation-graph";

export type { RankedRuntimeCandidate, RuntimeRouterScoreBreakdown };
export { selectBestRuntimeForCapability, rankRuntimesForCapability };

export type RuntimeRouterInput = {
  readonly action: RimvioRuntimeAction;
  readonly platformId: string;
  readonly platformName?: string;
  readonly marketCountry?: string;
  readonly utterance?: string;
  readonly preferredRuntimeId?: string | null;
  readonly maxAttempts?: number;
};

export type RuntimeRouterResult = RimvioRuntimeObservation & {
  readonly runtimeId: string;
  readonly runtimeName: string;
  readonly routedVia: "router-ranked" | "preferred-runtime" | "router-fallback";
  readonly scores: RuntimeRouterScoreBreakdown;
  readonly attemptedRuntimeIds: readonly string[];
  readonly rankedCandidates: readonly RankedRuntimeCandidate[];
  readonly durationMs?: number;
};

export function previewRuntimeRouter(input: {
  readonly capabilityId: string;
  readonly platformId?: string;
  readonly marketCountry?: string;
  readonly utterance?: string;
}): readonly RankedRuntimeCandidate[] {
  return rankRuntimesForCapability({
    capabilityId: input.capabilityId,
    platformId: input.platformId,
    marketCountry: input.marketCountry,
    utterance: input.utterance,
  });
}

function resolveCandidateOrder(
  input: RuntimeRouterInput,
  capabilityId: string,
): readonly RankedRuntimeCandidate[] {
  const ranked = rankRuntimesForCapability({
    capabilityId,
    platformId: input.platformId,
    marketCountry: input.marketCountry,
    utterance: input.utterance,
  });

  if (!input.preferredRuntimeId) return ranked;

  const preferred = ranked.find((r) => r.runtime.id === input.preferredRuntimeId);
  if (!preferred) return ranked;

  return [preferred, ...ranked.filter((r) => r.runtime.id !== preferred.runtime.id)];
}

async function executeOnRuntime(
  candidate: RankedRuntimeCandidate,
  input: RuntimeRouterInput,
  capabilityId: string,
): Promise<CapabilityInvokeObservation> {
  mountPlatformHostApis();
  const apis = readPlatformHostApis();
  const started = Date.now();

  const result = await apis.capabilities.invoke({
    platformId: input.platformId,
    capabilityId,
    input: {
      ...input.action.input,
      runtimeId: candidate.runtime.id,
      utterance: input.utterance,
    },
    approvalPolicy: input.action.approvalPolicy,
    runtimeId: candidate.runtime.id,
  });

  return {
    ok: result.ok,
    output: result.output,
    errorKo: result.errorKo,
    durationMs: Date.now() - started,
    runtimeId: candidate.runtime.id,
    runtimeName: candidate.runtime.name,
    scores: candidate.scores,
  };
}

type CapabilityInvokeObservation = {
  readonly ok: boolean;
  readonly output?: Record<string, unknown>;
  readonly errorKo?: string;
  readonly durationMs: number;
  readonly runtimeId: string;
  readonly runtimeName: string;
  readonly scores: RuntimeRouterScoreBreakdown;
};

/**
 * Select runtime from Hub Registry, execute capability, fallback on failure.
 */
export async function routeRuntimeExecute(
  input: RuntimeRouterInput,
): Promise<RuntimeRouterResult> {
  const capabilityId =
    input.action.capabilityId ?? input.action.toolId.replace(/^tool\./, "");

  const policyError = enforcePaymentCommitPolicy(capabilityId, input.action.approvalPolicy);
  if (policyError) {
    return {
      ok: false,
      failed: true,
      errorKo: policyError,
      requiresApproval: true,
      runtimeId: "",
      runtimeName: "",
      routedVia: "router-ranked",
      scores: emptyScores(),
      attemptedRuntimeIds: [],
      rankedCandidates: [],
    };
  }

  const candidates = resolveCandidateOrder(input, capabilityId);
  const maxAttempts = input.maxAttempts ?? Math.min(3, candidates.length);
  const attemptedRuntimeIds: string[] = [];

  if (candidates.length === 0) {
    return {
      ok: false,
      failed: true,
      errorKo: "Hub Registry에 호환 Runtime이 없습니다",
      requiresApproval: input.action.approvalPolicy !== "none",
      runtimeId: "",
      runtimeName: "",
      routedVia: "router-ranked",
      scores: emptyScores(),
      attemptedRuntimeIds,
      rankedCandidates: [],
    };
  }

  let lastError = "실행 실패";
  let lastObservation: CapabilityInvokeObservation | null = null;

  for (const candidate of candidates.slice(0, maxAttempts)) {
    attemptedRuntimeIds.push(candidate.runtime.id);
    const observation = await executeOnRuntime(candidate, input, capabilityId);
    lastObservation = observation;

    if (observation.ok) {
      const routedVia =
        attemptedRuntimeIds.length === 1 && candidate.runtime.id === input.preferredRuntimeId
          ? "preferred-runtime"
          : attemptedRuntimeIds.length === 1
            ? "router-ranked"
            : "router-fallback";

      return {
        ok: true,
        output: observation.output,
        requiresApproval: input.action.approvalPolicy !== "none",
        failed: false,
        runtimeId: observation.runtimeId,
        runtimeName: observation.runtimeName,
        routedVia,
        scores: observation.scores,
        attemptedRuntimeIds,
        rankedCandidates: candidates,
        durationMs: observation.durationMs,
      };
    }

    lastError = observation.errorKo ?? lastError;
  }

  const fallback = lastObservation ?? {
    ok: false,
    runtimeId: candidates[0]!.runtime.id,
    runtimeName: candidates[0]!.runtime.name,
    scores: candidates[0]!.scores,
    durationMs: 0,
  };

  return {
    ok: false,
    failed: true,
    errorKo: lastError,
    requiresApproval: input.action.approvalPolicy !== "none",
    runtimeId: fallback.runtimeId,
    runtimeName: fallback.runtimeName,
    routedVia: "router-fallback",
    scores: fallback.scores,
    attemptedRuntimeIds,
    rankedCandidates: candidates,
    durationMs: fallback.durationMs,
  };
}

export function resolveRuntimeRouterSelection(input: {
  readonly capabilityId: string;
  readonly platformId?: string;
  readonly marketCountry?: string;
  readonly utterance?: string;
}): {
  readonly selected: RankedRuntimeCandidate | null;
  readonly candidates: readonly RankedRuntimeCandidate[];
} {
  const candidates = rankRuntimesForCapability(input);
  return { selected: candidates[0] ?? null, candidates };
}

/** Lookup runtime entry after router selection (projection / logs). */
export function readSelectedRuntimeEntry(runtimeId: string) {
  return readRuntimeIndex().find((r) => r.id === runtimeId) ?? null;
}

function emptyScores(): RuntimeRouterScoreBreakdown {
  return {
    capabilityMatch: 0,
    infrastructureMatch: 0,
    permissionMatch: 0,
    contextMatch: 0,
    health: 0,
    reliability: 0,
    latency: 0,
    cost: 0,
    composite: 0,
  };
}
