/**
 * Optional session SSOT for the last compiled Field Control Plane.
 * Callers may re-parse; store exists so graph/search/booking share one pack.
 */

import type { ContextFieldControlPlane } from "@/lib/context-field/project-field-control-plane";

const byKey = new Map<string, ContextFieldControlPlane>();

export function writeContextFieldControl(
  key: string,
  plane: ContextFieldControlPlane,
): void {
  const trimmed = key.trim();
  if (!trimmed) {
    return;
  }
  byKey.set(trimmed, plane);
}

export function readContextFieldControl(
  key: string,
): ContextFieldControlPlane | null {
  const trimmed = key.trim();
  if (!trimmed) {
    return null;
  }
  return byKey.get(trimmed) ?? null;
}

export function clearContextFieldControl(key?: string): void {
  if (key?.trim()) {
    byKey.delete(key.trim());
    return;
  }
  byKey.clear();
}

export function resetContextFieldControlStoreForTests(): void {
  byKey.clear();
}
