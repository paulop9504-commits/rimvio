/**
 * Pending lodging stay revise — Intent only until human confirms (ask chip / 응).
 */

import type { LodgingStayReviseProposal } from "@/lib/globe/context-hub/parse-lodging-stay-revise";

const pendingByContext = new Map<string, LodgingStayReviseProposal>();

export function writeLodgingStayRevisePending(
  contextEventId: string,
  proposal: LodgingStayReviseProposal,
): void {
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  pendingByContext.set(id, proposal);
}

export function readLodgingStayRevisePending(
  contextEventId: string,
): LodgingStayReviseProposal | null {
  return pendingByContext.get(contextEventId.trim()) ?? null;
}

export function clearLodgingStayRevisePending(contextEventId: string): void {
  pendingByContext.delete(contextEventId.trim());
}
