/**
 * Runner registry — routes capabilityId → browser | workspace | api | graph runner.
 */

import { resolveCapabilityRunner } from "@/lib/sandbox/capability/index";
import {
  getCatalogCapability,
  resolveRuntimeKind,
} from "./capability-catalog";
import type { CapabilityRuntimeKind } from "./types";
import {
  isApiCapability,
  isGraphCapability,
  isSystemCapability,
  isWorkspaceCapability,
  runApiCapability,
  runGraphCapability,
  runLodgingCompositeCapability,
  runSystemCapability,
  runTravelCapability,
  runWorkspaceCapability,
  type RunnerContext,
  type RunnerResult,
} from "./runners/mutation-runners";

export function resolveAgentPlatformRuntimeKind(capabilityId: string): CapabilityRuntimeKind {
  if (resolveCapabilityRunner(capabilityId)) return "browser";
  if (isLodgingCompositeCapability(capabilityId)) return "composite";
  return resolveRuntimeKind(capabilityId);
}

export async function executeAgentPlatformRunner(
  capabilityId: string,
  ctx: RunnerContext,
): Promise<RunnerResult & { readonly runtimeKind: CapabilityRuntimeKind }> {
  const runtimeKind = resolveAgentPlatformRuntimeKind(capabilityId);

  if (runtimeKind === "browser") {
    return {
      ok: true,
      runtimeKind,
      output: { queued: true, note: "Browser execution delegated to sandbox controller." },
    };
  }

  if (isWorkspaceCapability(capabilityId)) {
    const result = await runWorkspaceCapability(capabilityId, ctx);
    return { ...result, runtimeKind: "workspace" };
  }

  if (isLodgingCompositeCapability(capabilityId)) {
    const result = await runLodgingCompositeCapability(capabilityId, ctx);
    return { ...result, runtimeKind: "composite" };
  }

  if (isTravelCapability(capabilityId)) {
    const result = await runTravelCapability(capabilityId, ctx);
    return { ...result, runtimeKind: "composite" };
  }

  if (isGraphCapability(capabilityId)) {
    const result = await runGraphCapability(capabilityId, ctx);
    return { ...result, runtimeKind: "graph" };
  }

  if (isApiCapability(capabilityId)) {
    const result = await runApiCapability(capabilityId, ctx);
    return { ...result, runtimeKind: "api" };
  }

  if (isSystemCapability(capabilityId)) {
    const result = await runSystemCapability(capabilityId, ctx);
    return { ...result, runtimeKind: "composite" };
  }

  const def = getCatalogCapability(capabilityId);
  if (def?.runnable) {
    return {
      ok: true,
      runtimeKind: def.runtimeKind,
      output: { prepare: true, capabilityId },
    };
  }

  return {
    ok: true,
    runtimeKind: "prepare-only",
    output: { prepare: true, capabilityId, note: "Catalog entry — runner not yet wired." },
  };
}

function isLodgingCompositeCapability(capabilityId: string): boolean {
  return ["hotel.filter", "hotel.rank", "hotel.compare", "hotel.nearby"].includes(capabilityId);
}

export function isBrowserCapability(capabilityId: string): boolean {
  return resolveAgentPlatformRuntimeKind(capabilityId) === "browser";
}

function isTravelCapability(capabilityId: string): boolean {
  return (
    capabilityId.startsWith("trip.") ||
    ["eatery.search", "poi.discover", "route.plan", "itinerary.build", "transit.absorb"].includes(
      capabilityId,
    )
  );
}
