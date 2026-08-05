/**
 * Reality absorb runner — Need → Provider → Acquire → Project (ADR-051).
 * Single public Ingress for network absorb Needs.
 */

import { acquireNetwork } from "@/lib/reality-provider/acquire-network";
import { projectNetworkAbsorb } from "@/lib/reality-provider/project-network-absorb";
import { resolveRealityNeedFromUtterance } from "@/lib/reality-provider/resolve-need";
import { resolveRealityProvider } from "@/lib/reality-provider/resolve-provider";
import type { RealityProviderId } from "@/lib/reality-provider/types";

const NETWORK_NEEDS = new Set([
  "rail_network",
  "metro_network",
  "shinkansen_network",
]);

export type RealityAbsorbResult = {
  readonly handled: boolean;
  readonly statusKo: string;
  readonly needId: string | null;
  readonly providerId: RealityProviderId | null;
  readonly workspacePatched: boolean;
  /** Session Projection store updated — Map can paint even without Workspace write. */
  readonly mapProjected: boolean;
};

/**
 * Try absorb external Reality into Workspace Projection.
 * Returns null when utterance is not a network absorb Need
 * (lodging stays ADR-050; poi_geometry uses absorbPoiGeometryForPlace).
 */
export function tryApplyRealityAbsorbFromUtterance(input: {
  readonly utterance: string;
  readonly contextEventId?: string | null;
}): RealityAbsorbResult | null {
  const need = resolveRealityNeedFromUtterance(input.utterance);
  if (!need) return null;
  if (!NETWORK_NEEDS.has(need.needId)) return null;

  const resolution = resolveRealityProvider(need);
  if (resolution.candidates.length === 0) {
    return {
      handled: true,
      statusKo: "Reality Provider 없음",
      needId: need.needId,
      providerId: null,
      workspacePatched: false,
      mapProjected: false,
    };
  }

  let lastFail = "Acquire 실패";
  for (const candidate of resolution.candidates) {
    const acquired = acquireNetwork({
      need,
      providerId: candidate.providerId,
    });
    if (!acquired.ok) {
      lastFail = acquired.reasonKo;
      // City metro missing cache — don't mask with "osm 미연결".
      if (/도시철 캐시는 아직/u.test(lastFail)) {
        return {
          handled: true,
          statusKo: lastFail,
          needId: need.needId,
          providerId: candidate.providerId,
          workspacePatched: false,
          mapProjected: false,
        };
      }
      continue;
    }
    const projected = projectNetworkAbsorb({
      need,
      bundle: acquired.bundle,
      contextEventId: input.contextEventId,
    });
    return {
      handled: true,
      statusKo: projected.statusKo,
      needId: need.needId,
      providerId: projected.providerId,
      workspacePatched: projected.workspacePatched,
      mapProjected: true,
    };
  }

  return {
    handled: true,
    statusKo: lastFail,
    needId: need.needId,
    providerId: resolution.selected?.providerId ?? null,
    workspacePatched: false,
    mapProjected: false,
  };
}
