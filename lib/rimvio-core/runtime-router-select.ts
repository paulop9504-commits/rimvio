/**
 * Runtime Router — rank Hub Registry runtimes for a Capability (ADR-062).
 */

import { readInfrastructureIndex } from "@/lib/hub/dev/infrastructure-registry";
import {
  listPublishedRuntimes,
  type RuntimeCostTier,
  type RuntimeIndexEntry,
} from "@/lib/hub/dev/runtime-registry";
import {
  resolveCapabilityRuntimeRequirements,
  type RuntimeRequirement,
} from "@/lib/platform-sdk/runtime-requirements";

export type RuntimeRouterScoreBreakdown = {
  readonly capabilityMatch: number;
  readonly infrastructureMatch: number;
  readonly permissionMatch: number;
  readonly contextMatch: number;
  readonly health: number;
  readonly reliability: number;
  readonly latency: number;
  readonly cost: number;
  readonly composite: number;
};

export type RankedRuntimeCandidate = {
  readonly runtime: RuntimeIndexEntry;
  readonly scores: RuntimeRouterScoreBreakdown;
  readonly missingRequirements: readonly RuntimeRequirement[];
  readonly eligible: boolean;
  readonly selectionReasonKo: string;
};

export type RuntimeRouterSelectInput = {
  readonly capabilityId: string;
  readonly platformId?: string;
  readonly marketCountry?: string;
  readonly utterance?: string;
};

const WEIGHTS = {
  capabilityMatch: 0.25,
  infrastructureMatch: 0.1,
  permissionMatch: 0.1,
  contextMatch: 0.1,
  health: 0.15,
  reliability: 0.12,
  latency: 0.1,
  cost: 0.08,
} as const;

function runtimeMeetsRequirement(
  runtime: RuntimeIndexEntry,
  requirement: RuntimeRequirement,
): boolean {
  switch (requirement) {
    case "tool":
      return runtime.interfaces.includes("tool");
    case "context":
      return runtime.interfaces.includes("context");
    case "event":
      return runtime.interfaces.includes("event");
    case "permission":
      return runtime.interfaces.includes("permission");
    case "network":
      return runtime.supports.includes("network");
    case "database":
      return runtime.supports.includes("database");
    case "plc":
      return runtime.supports.includes("plc");
    case "camera":
      return runtime.supports.includes("camera");
    case "browser":
      return (
        runtime.type === "browser" || runtime.type === "cloud" || runtime.type === "pc"
      );
    case "location":
      return runtime.interfaces.includes("context") || runtime.supports.includes("sensor");
    default:
      return true;
  }
}

function scoreCost(tier: RuntimeCostTier): number {
  if (tier === "low") return 1;
  if (tier === "medium") return 0.72;
  return 0.45;
}

function scoreLatency(latencyMsP50: number): number {
  return Math.max(0, 1 - latencyMsP50 / 1200);
}

function scoreReliability(runtime: RuntimeIndexEntry): number {
  let score = runtime.status === "certified" ? 0.98 : 0.85;
  if (runtime.tier === "core") score = Math.min(1, score + 0.04);
  if (runtime.securityPolicy === "rimvio-enforced") score = Math.min(1, score + 0.02);
  return score;
}

function scoreInfrastructure(runtime: RuntimeIndexEntry, infraKinds: readonly string[]): number {
  if (infraKinds.length === 0) return 1;

  const infra = readInfrastructureIndex().filter((i) => i.status === "published");
  const linked = infra.filter((i) => i.compatibleRuntimeIds.includes(runtime.id));
  if (linked.length === 0) {
    return runtime.tier === "core" && !infraKinds.includes("plc") ? 0.85 : 0.35;
  }

  const kindHits = linked.filter((i) => infraKinds.includes(i.kind)).length;
  return Math.min(1, 0.6 + kindHits * 0.2);
}

function scoreContext(input: RuntimeRouterSelectInput, runtime: RuntimeIndexEntry): number {
  const reqs = resolveCapabilityRuntimeRequirements(input.capabilityId);
  let score = 0.75;

  if (reqs.preferredRuntimeTypes.includes(runtime.type)) {
    score = 0.92;
  }

  if (input.utterance && /근처|near|location|지도|map/i.test(input.utterance)) {
    if (runtime.type === "browser" || runtime.type === "mobile") {
      score = Math.min(1, score + 0.06);
    }
  }

  if (input.marketCountry && input.marketCountry !== "GLOBAL") {
    score = Math.min(1, score + 0.03);
  }

  return score;
}

function scorePermission(runtime: RuntimeIndexEntry): number {
  if (runtime.securityPolicy !== "rimvio-enforced") return 0;
  return runtime.interfaces.includes("permission") ? 1 : 0.88;
}

export function rankRuntimesForCapability(
  input: RuntimeRouterSelectInput,
): readonly RankedRuntimeCandidate[] {
  const requirements = resolveCapabilityRuntimeRequirements(input.capabilityId);
  const runtimes = listPublishedRuntimes();

  const ranked = runtimes.map((runtime) => {
    const missingRequirements = requirements.required.filter(
      (req) => !runtimeMeetsRequirement(runtime, req),
    );
    const capabilityMatch =
      missingRequirements.length === 0
        ? 1
        : Math.max(0, 1 - missingRequirements.length / requirements.required.length);

    const infrastructureMatch = scoreInfrastructure(
      runtime,
      requirements.infrastructureKinds,
    );
    const permissionMatch = scorePermission(runtime);
    const contextMatch = scoreContext(input, runtime);
    const health = runtime.operational.healthScore;
    const reliability = scoreReliability(runtime);
    const latency = scoreLatency(runtime.operational.latencyMsP50);
    const cost = scoreCost(runtime.operational.costTier);

    const composite =
      capabilityMatch * WEIGHTS.capabilityMatch +
      infrastructureMatch * WEIGHTS.infrastructureMatch +
      permissionMatch * WEIGHTS.permissionMatch +
      contextMatch * WEIGHTS.contextMatch +
      health * WEIGHTS.health +
      reliability * WEIGHTS.reliability +
      latency * WEIGHTS.latency +
      cost * WEIGHTS.cost;

    const eligible = missingRequirements.length === 0 && capabilityMatch >= 1;

    let selectionReasonKo = eligible ? "호환 · Router 후보" : "요구사항 미충족";
    if (eligible && runtime.type === "browser") {
      selectionReasonKo = `Browser · ${runtime.operational.latencyMsP50}ms · health ${(health * 100).toFixed(1)}%`;
    }

    return {
      runtime,
      scores: {
        capabilityMatch,
        infrastructureMatch,
        permissionMatch,
        contextMatch,
        health,
        reliability,
        latency,
        cost,
        composite,
      },
      missingRequirements,
      eligible,
      selectionReasonKo,
    };
  });

  return ranked
    .filter((r) => r.eligible)
    .sort((a, b) => {
      if (b.scores.composite !== a.scores.composite) {
        return b.scores.composite - a.scores.composite;
      }
      return a.runtime.operational.latencyMsP50 - b.runtime.operational.latencyMsP50;
    });
}

export function selectBestRuntimeForCapability(
  input: RuntimeRouterSelectInput,
): RankedRuntimeCandidate | null {
  return rankRuntimesForCapability(input)[0] ?? null;
}
