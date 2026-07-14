"use client";

import {
  clearPendingFieldHandoff,
  readPendingFieldHandoff,
} from "@/lib/engine/team-collab/field-handoff-queue";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { openFieldDashboardIngress } from "@/lib/nav/field-dashboard-ingress";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

/**
 * Phase 2 — pass prepared MAIN work to Field Reality queue.
 * Never Commits; only opens the existing Field sheet.
 */
export function openPendingFieldHandoffClient(
  contextEventId: string,
): boolean {
  const event = findLifeEventCandidate(contextEventId);
  if (!event?.metadata) {
    return false;
  }
  const pending = readPendingFieldHandoff(event.metadata);
  if (!pending) {
    return false;
  }

  openFieldDashboardIngress({
    tab: pending.tab,
    primaryEventId: contextEventId,
  });

  commitEventUpsert({
    ...event,
    metadata: clearPendingFieldHandoff(event.metadata),
    updatedAt: new Date().toISOString(),
  });
  return true;
}
