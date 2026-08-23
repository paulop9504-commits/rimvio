/**
 * Resolve trip schedule for Jarvis peer send (shareTrip).
 * Uses Reality Draft / Context Brief from active Workspace — no LLM.
 */

import { buildContextBrief } from "@/lib/context-workspace/context-brief/build-context-brief";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";

export type PeerSendTripShare = {
  readonly shareTripLabel: string;
  readonly tripScheduleLines: readonly string[];
};

export function resolvePeerSendTripShare(
  contextEventId: string | null | undefined,
): PeerSendTripShare | null {
  const key = contextEventId?.trim();
  if (!key) {
    return null;
  }

  const ws = readContextWorkspace(key);
  if (!ws) {
    return null;
  }

  const draft = ws.realityDraft ?? null;
  if (draft && draft.days.length > 0) {
    const label =
      draft.contextTitleKo?.trim() ||
      draft.destinationKo?.trim() ||
      "여행";
    return {
      shareTripLabel: label,
      tripScheduleLines: draft.days.map(
        (day) => `${day.labelKo} ${day.lineKo}`.trim(),
      ),
    };
  }

  const brief = buildContextBrief(ws);
  if (brief.groundsKo.length === 0 && brief.roles.length === 0) {
    return null;
  }

  const label = brief.titleKo?.trim() || "여행";
  const lines = [
    ...brief.groundsKo.slice(0, 3),
    ...brief.roles.slice(0, 4).map((r) => `${r.labelKo}: ${r.placeTitle}`),
  ].filter(Boolean);

  if (lines.length === 0) {
    return null;
  }

  return {
    shareTripLabel: label,
    tripScheduleLines: lines,
  };
}
