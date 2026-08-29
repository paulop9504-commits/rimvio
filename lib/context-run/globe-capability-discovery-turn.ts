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

export async function executeGlobeCapabilityDiscovery(input: {
  readonly utterance: string;
}): Promise<GlobeCapabilityDiscoveryProjection | null> {
  const utterance = input.utterance.trim();
  if (!utterance) return null;

  const intentFrame = compileIntentFromUtterance(utterance);
  const plan = planCapabilityDiscovery({ utterance, intentFrame });
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
    (h) => h.capabilityId !== plan.capabilityId,
  );

  const router = await routeRuntimeExecute({
    platformId: plan.platformId,
    platformName: plan.platformName,
    marketCountry: plan.marketCountry,
    utterance,
    action: {
      toolId: plan.capabilityId,
      capabilityId: plan.capabilityId,
      input: { utterance },
      approvalPolicy: plan.approvalRequired ? "user_required" : "none",
    },
  });

  const platformHref = buildPlatformCapabilityHref(plan);
  const statusKo = router.ok
    ? `${plan.capabilityId} · ${router.runtimeName} · ${planLabelKo(plan)} 준비됨`
    : `${plan.capabilityId} · Runtime 실행 실패 (${router.attemptedRuntimeIds.length}회 시도)`;

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
  };

  persistGlobeCapabilityDiscoveryProjection(projection);
  return projection;
}

function planLabelKo(plan: CapabilityDiscoveryPlan): string {
  if (plan.capabilityId.startsWith("hotel.")) return "호텔 검색";
  if (plan.capabilityId.startsWith("booking.")) return "예약";
  if (plan.capabilityId.startsWith("market.")) return "마켓플레이스";
  return plan.capabilityId.replace(/\./g, " ");
}
