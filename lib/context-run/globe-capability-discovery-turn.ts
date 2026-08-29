/**
 * Globe Agent ↔ Hub Capability Registry — discovery + Runtime Router execution.
 */

import type { CapabilityDiscoveryPlan } from "@/lib/platform-sdk/discover-capabilities";
import {
  planCapabilityDiscovery,
  planCapabilityDiscoveryFromHits,
} from "@/lib/platform-sdk/discover-capabilities";
import { resolveCapabilityExecution } from "@/lib/platform-sdk/resolve-capability-execution";
import {
  resolveCapabilityCompatibilityGraph,
  type CapabilityCompatibilityGraph,
} from "@/lib/hub/dev/compatibility-validation-graph";
import { routeRuntimeExecute } from "@/lib/rimvio-core/runtime-router";
import type { RankedRuntimeCandidate } from "@/lib/rimvio-core/runtime-router-select";
import type { RuntimeRouterResult } from "@/lib/rimvio-core/runtime-router";
import { compileIntentFromUtterance } from "@/lib/rimvio-protocol/intent";
import {
  normalizeCapabilityOutput,
  fuseCanonicalResults,
  type RimvioCanonicalItem,
} from "@/lib/platform-sdk/canonical-capability-result";
import {
  commitCapabilityApprovalPending,
  createCapabilityApprovalPending,
  readCapabilityApprovalPending,
  type CapabilityApprovalPending,
} from "@/lib/platform-sdk/capability-approval-pending";
import type { CapabilityExposurePlan } from "@/lib/platform-sdk/capability-exposure-policy";
import {
  projectCapabilityExperience,
  summarizeExposurePipeline,
  type RimvioExperienceProjection,
} from "@/lib/platform-sdk/capability-ui-projection";

export type GlobeCapabilityDiscoveryProjection = {
  readonly utterance: string;
  readonly plan: CapabilityDiscoveryPlan;
  readonly alternateHits: readonly CapabilityDiscoveryPlan[];
  readonly prepareOk: boolean;
  readonly platformHref: string;
  readonly statusKo: string;
  readonly discoveredAtIso: string;
  readonly execution: ReturnType<typeof resolveCapabilityExecution>;
  readonly compatibility: CapabilityCompatibilityGraph;
  readonly router: RuntimeRouterResult;
  readonly rankedRuntimes: readonly RankedRuntimeCandidate[];
  readonly canonicalItems: readonly RimvioCanonicalItem[];
  readonly approvalPending: CapabilityApprovalPending | null;
  readonly awaitingApproval: boolean;
  readonly exposure: CapabilityExposurePlan | null;
  readonly experience: RimvioExperienceProjection | null;
};

const PROJECTION_KEY = "rimvio.globe.capability-discovery.v1";
const PROJECTION_EVENT = "rimvio:globe-capability-discovery";

let memoryProjection: GlobeCapabilityDiscoveryProjection | null = null;

function emitProjection(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PROJECTION_EVENT));
  }
}

export function buildPlatformCapabilityHref(plan: CapabilityDiscoveryPlan): string {
  const params = new URLSearchParams({
    capability: plan.capabilityId,
  });
  if (plan.routePath && plan.routePath !== "/") {
    params.set("path", plan.routePath);
  }
  return `/platform/${encodeURIComponent(plan.platformId)}?${params.toString()}`;
}

export function readGlobeCapabilityDiscoveryProjection(): GlobeCapabilityDiscoveryProjection | null {
  if (memoryProjection) return memoryProjection;
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(PROJECTION_KEY);
      if (raw) {
        memoryProjection = JSON.parse(raw) as GlobeCapabilityDiscoveryProjection;
        return memoryProjection;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export function persistGlobeCapabilityDiscoveryProjection(
  projection: GlobeCapabilityDiscoveryProjection,
): void {
  memoryProjection = projection;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(PROJECTION_KEY, JSON.stringify(projection));
    } catch {
      // ignore
    }
  }
  emitProjection();
}

export function subscribeGlobeCapabilityDiscovery(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener(PROJECTION_EVENT, handler);
  return () => window.removeEventListener(PROJECTION_EVENT, handler);
}

export function clearGlobeCapabilityDiscoveryProjection(): void {
  memoryProjection = null;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(PROJECTION_KEY);
    } catch {
      // ignore
    }
  }
  emitProjection();
}

function buildAwaitingApprovalRouter(plan: CapabilityDiscoveryPlan): RuntimeRouterResult {
  return {
    ok: true,
    failed: false,
    requiresApproval: true,
    runtimeId: "",
    runtimeName: "",
    routedVia: "router-ranked",
    scores: {
      capabilityMatch: plan.scores.intentMatch,
      infrastructureMatch: 0,
      permissionMatch: 0,
      contextMatch: plan.scores.contextMatch,
      health: 0,
      reliability: plan.scores.reliability,
      latency: 0,
      cost: 0,
      composite: plan.scores.composite,
    },
    attemptedRuntimeIds: [],
    rankedCandidates: [],
  };
}

async function executeCapabilityRouter(input: {
  readonly plan: CapabilityDiscoveryPlan;
  readonly utterance: string;
}): Promise<RuntimeRouterResult> {
  return routeRuntimeExecute({
    platformId: input.plan.platformId,
    platformName: input.plan.platformName,
    marketCountry: input.plan.marketCountry,
    utterance: input.utterance,
    parallelProbe: true,
    parallelProbeCount: 3,
    action: {
      toolId: input.plan.capabilityId,
      capabilityId: input.plan.capabilityId,
      input: { utterance: input.utterance },
      approvalPolicy: input.plan.approvalRequired ? "user_required" : "none",
    },
  });
}

export async function executeGlobeCapabilityDiscovery(input: {
  readonly utterance: string;
  readonly approvalGranted?: boolean;
  readonly pendingId?: string;
}): Promise<GlobeCapabilityDiscoveryProjection | null> {
  const utterance = input.utterance.trim();
  if (!utterance) return null;

  let plan: CapabilityDiscoveryPlan | null = null;
  let approvalPending: CapabilityApprovalPending | null = null;

  if (input.approvalGranted && input.pendingId) {
    approvalPending = readCapabilityApprovalPending(input.pendingId);
    plan = approvalPending?.plan ?? null;
  }

  if (!plan) {
    const intentFrame = compileIntentFromUtterance(utterance);
    plan = planCapabilityDiscovery({ utterance, intentFrame });
  }
  if (!plan) return null;

  const execution = resolveCapabilityExecution({ plan, utterance });
  if (!execution.compatible || !execution.runtime) {
    return null;
  }

  const compatibility = resolveCapabilityCompatibilityGraph({
    capabilityId: plan.capabilityId,
    platformId: plan.platformId,
    utterance,
  });
  if (!compatibility.graphValid) {
    return null;
  }

  const alternateHits = planCapabilityDiscoveryFromHits(utterance).filter(
    (h) => h.capabilityId !== plan!.capabilityId,
  );

  const platformHref = buildPlatformCapabilityHref(plan);
  const needsApprovalGate = plan.approvalRequired && !input.approvalGranted;

  const exposure = plan.exposure ?? null;
  const pipelineSummaryKo = exposure ? summarizeExposurePipeline(exposure.pipeline) : undefined;

  if (needsApprovalGate) {
    approvalPending = createCapabilityApprovalPending({ utterance, plan, platformHref });
    const experience = projectCapabilityExperience({
      utterance,
      capabilityId: plan.capabilityId,
      experienceLabelKo: plan.planLabelKo,
      pipelineSummaryKo,
      awaitingApproval: true,
    });
    const projection: GlobeCapabilityDiscoveryProjection = {
      utterance,
      plan,
      alternateHits,
      prepareOk: true,
      platformHref,
      statusKo: experience.workLogKo,
      discoveredAtIso: new Date().toISOString(),
      execution,
      compatibility,
      router: buildAwaitingApprovalRouter(plan),
      rankedRuntimes: execution.rankedCandidates,
      canonicalItems: [],
      approvalPending,
      awaitingApproval: true,
      exposure,
      experience,
    };
    persistGlobeCapabilityDiscoveryProjection(projection);
    return projection;
  }

  const router = await executeCapabilityRouter({ plan, utterance });
  if (input.approvalGranted && input.pendingId) {
    commitCapabilityApprovalPending({ pendingId: input.pendingId, router });
  }

  const primaryItems = normalizeCapabilityOutput(router.output, {
    platformId: plan.platformId,
    capabilityId: plan.capabilityId,
    platformName: plan.platformName,
  });

  const alternateItemBatches = alternateHits.map((alt) => ({
    items: normalizeCapabilityOutput(undefined, {
      platformId: alt.platformId,
      capabilityId: alt.capabilityId,
      platformName: alt.platformName,
    }),
  }));

  const canonicalItems = fuseCanonicalResults([{ items: primaryItems }, ...alternateItemBatches]);

  const experience = projectCapabilityExperience({
    utterance,
    capabilityId: plan.capabilityId,
    experienceLabelKo: plan.planLabelKo,
    pipelineSummaryKo,
    canonicalItems,
    awaitingApproval: false,
  });

  const statusKo = router.ok ? experience.workLogKo : "실행에 실패했어요. 다시 시도해 주세요.";

  const projection: GlobeCapabilityDiscoveryProjection = {
    utterance,
    plan,
    alternateHits,
    prepareOk: router.ok,
    platformHref,
    statusKo,
    discoveredAtIso: new Date().toISOString(),
    execution,
    compatibility,
    router,
    rankedRuntimes: router.rankedCandidates,
    canonicalItems,
    approvalPending: null,
    awaitingApproval: false,
    exposure,
    experience,
  };

  persistGlobeCapabilityDiscoveryProjection(projection);
  return projection;
}
