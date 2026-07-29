/**
 * Reality Object store — CRUD + state transitions.
 */

import type { RealityObject, RealityObjectState } from "@/lib/reality-object/types";
import { REALITY_OBJECT_TRANSITIONS } from "@/lib/reality-object/types";

const objects = new Map<string, RealityObject>();

export function createRealityObject(
  input: Omit<RealityObject, "createdAt" | "updatedAt" | "commitHistory" | "state">,
): RealityObject {
  const now = new Date().toISOString();
  const obj: RealityObject = {
    ...input,
    state: "discovered",
    commitHistory: [],
    createdAt: now,
    updatedAt: now,
  };
  objects.set(obj.objectId, obj);
  return obj;
}

export function getRealityObject(objectId: string): RealityObject | null {
  return objects.get(objectId) ?? null;
}

export function transitionRealityObject(
  objectId: string,
  targetState: RealityObjectState,
): RealityObject | null {
  const obj = objects.get(objectId);
  if (!obj) return null;

  const allowed = REALITY_OBJECT_TRANSITIONS[obj.state];
  if (!allowed.includes(targetState)) return null;

  const updated: RealityObject = {
    ...obj,
    state: targetState,
    updatedAt: new Date().toISOString(),
  };
  objects.set(objectId, updated);
  return updated;
}

export function listRealityObjects(contextId?: string): readonly RealityObject[] {
  const all = [...objects.values()];
  if (!contextId) return all;
  return all.filter((o) => o.contextId === contextId);
}

export function clearRealityObjects(): void {
  objects.clear();
}
