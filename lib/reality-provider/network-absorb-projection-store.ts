/**
 * Session bridge for network absorb Projection.
 * Workspace.networkAbsorb is durable SSOT; this store mirrors it for Map hooks
 * (and for absorb when no Workspace context is open).
 *
 * Domain overlay stores are NOT synced — Map reads absorb SSOT only.
 */

import {
  foldAbsorbNetworkVisibility,
  getFamilyVisibleLineIds,
  type AbsorbNetworkVisibilityPatch,
  type NetworkAbsorbFamily,
  type NetworkAbsorbProjectionState,
} from "@/lib/reality-provider/network-absorb-projection";

const listeners = new Set<() => void>();
let projection: NetworkAbsorbProjectionState = {
  version: 1,
  families: {},
};

function emit(): void {
  for (const l of listeners) l();
}

export function subscribeNetworkAbsorbProjection(
  listener: () => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNetworkAbsorbProjection(): NetworkAbsorbProjectionState {
  return projection;
}

export function getNetworkAbsorbVisibleLineIds(
  family: NetworkAbsorbFamily,
): readonly string[] {
  return getFamilyVisibleLineIds(projection, family);
}

/** Replace session projection (e.g. hydrate from Workspace on open). */
export function setNetworkAbsorbProjection(
  next: NetworkAbsorbProjectionState,
): void {
  projection = next?.version === 1 ? next : { version: 1, families: {} };
  emit();
}

/** Apply visibility patch to session materialized state. */
export function applyNetworkAbsorbVisibilityPatch(
  patch: AbsorbNetworkVisibilityPatch,
): NetworkAbsorbProjectionState {
  projection = foldAbsorbNetworkVisibility(projection, patch);
  emit();
  return projection;
}

/** @internal tests */
export function clearNetworkAbsorbProjectionForTests(): void {
  projection = { version: 1, families: {} };
  emit();
}
