/**
 * Context Store — Reality Context Instance persistence (session memory).
 * Context carries Reality State; this store is the instance registry.
 */

import type { RealityContext } from "@/lib/context/context";
import {
  touchContextRealityState,
  withContextConstraints,
  withContextEntities,
  withContextStatus,
} from "@/lib/context/context";
import type { RealityContextStatus } from "@/lib/context/context-state";
import type {
  RealityContextConstraint,
  RealityContextEntityRef,
} from "@/lib/context/context";

const byId = new Map<string, RealityContext>();

export const REALITY_CONTEXT_UPDATED = "rimvio:reality-context-updated";

function emit(contextId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(REALITY_CONTEXT_UPDATED, {
      detail: { contextId },
    }),
  );
}

export function saveRealityContext(ctx: RealityContext): RealityContext {
  byId.set(ctx.id, ctx);
  emit(ctx.id);
  return ctx;
}

export function readRealityContext(contextId: string): RealityContext | null {
  return byId.get(contextId.trim()) ?? null;
}

export function listRealityContexts(): readonly RealityContext[] {
  return [...byId.values()];
}

export function listRealityContextsByStatus(
  status: RealityContextStatus,
): readonly RealityContext[] {
  return listRealityContexts().filter((c) => c.status === status);
}

export function updateRealityContextStatus(
  contextId: string,
  status: RealityContextStatus,
): RealityContext | null {
  const prev = readRealityContext(contextId);
  if (!prev) return null;
  const next = withContextStatus(prev, status);
  return saveRealityContext(next);
}

export function setRealityContextEntities(
  contextId: string,
  entities: readonly RealityContextEntityRef[],
): RealityContext | null {
  const prev = readRealityContext(contextId);
  if (!prev) return null;
  return saveRealityContext(withContextEntities(prev, entities));
}

export function setRealityContextConstraints(
  contextId: string,
  constraints: readonly RealityContextConstraint[],
): RealityContext | null {
  const prev = readRealityContext(contextId);
  if (!prev) return null;
  return saveRealityContext(withContextConstraints(prev, constraints));
}

export function patchRealityContextState(
  contextId: string,
  patch: Partial<RealityContext["realityState"]>,
): RealityContext | null {
  const prev = readRealityContext(contextId);
  if (!prev) return null;
  return saveRealityContext(touchContextRealityState(prev, patch));
}

export function clearRealityContextsForTests(contextId?: string): void {
  if (!contextId) {
    byId.clear();
    return;
  }
  byId.delete(contextId.trim());
}
