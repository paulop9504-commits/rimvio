import {
  canOfferGlobeLocationPrompt,
  markGlobeLocationPromptOffered,
} from "@/lib/globe/globe-location-prompt-budget";
import type { PendingGlobeLocationConfirm } from "@/lib/globe/list-pending-globe-location-confirms";

/** Inbox / proactive UI — at most one location row per local day. */
export function pickSurfacedLocationConfirms(
  rows: readonly PendingGlobeLocationConfirm[],
  input?: { now?: Date; markOffered?: boolean },
): PendingGlobeLocationConfirm[] {
  if (rows.length === 0) {
    return [];
  }
  const now = input?.now ?? new Date();
  if (!canOfferGlobeLocationPrompt(now)) {
    return [];
  }
  if (input?.markOffered !== false) {
    markGlobeLocationPromptOffered(now);
  }
  return [rows[0]!];
}
