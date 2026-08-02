/**
 * ReservationDraft store — Prepare Layer (status: draft only).
 * Forbidden: Reality Commit, payment, Globe stamp.
 */

import type { ReservationDraft } from "@/lib/callout/prepare/types";

/** contextId → objectId → draft */
const memory = new Map<string, Map<string, ReservationDraft>>();

export const RESERVATION_DRAFT_UPDATED = "rimvio:reservation-draft-updated";

function emit(contextId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(RESERVATION_DRAFT_UPDATED, {
      detail: { contextId },
    }),
  );
}

export function readReservationDraft(
  contextId: string,
  objectId: string,
): ReservationDraft | null {
  const ctx = contextId.trim();
  const oid = objectId.trim();
  if (!ctx || !oid) return null;
  return memory.get(ctx)?.get(oid) ?? null;
}

export function writeReservationDraft(draft: ReservationDraft): void {
  const ctx = draft.contextId.trim();
  if (!ctx) return;
  if (draft.status !== "draft") {
    throw new Error("ReservationDraft.status must remain draft in Prepare");
  }
  let bucket = memory.get(ctx);
  if (!bucket) {
    bucket = new Map();
    memory.set(ctx, bucket);
  }
  bucket.set(draft.objectId, {
    ...draft,
    status: "draft",
    updatedAtIso: new Date().toISOString(),
  });
  emit(ctx);
}

export function clearReservationDraft(
  contextId: string,
  objectId?: string,
): void {
  const ctx = contextId.trim();
  if (!ctx) return;
  if (!objectId) {
    memory.delete(ctx);
    emit(ctx);
    return;
  }
  memory.get(ctx)?.delete(objectId.trim());
  emit(ctx);
}
