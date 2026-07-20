/**
 * Pending soft-confirm graph edits — Intent only until human chip / 응.
 */

import type { SoftConfirmPending } from "@/lib/globe/soft-confirm/types";

const pendingByContext = new Map<string, SoftConfirmPending>();

export function writeSoftConfirmPending(
  contextEventId: string,
  pending: SoftConfirmPending,
): void {
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  pendingByContext.set(id, pending);
}

export function readSoftConfirmPending(
  contextEventId: string,
): SoftConfirmPending | null {
  return pendingByContext.get(contextEventId.trim()) ?? null;
}

export function clearSoftConfirmPending(contextEventId: string): void {
  pendingByContext.delete(contextEventId.trim());
}
