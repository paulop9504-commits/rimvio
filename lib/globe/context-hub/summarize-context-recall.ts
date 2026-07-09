/**
 * Destination recall — confirmed lodging + flight per Context (map badge, hub summary).
 * @see docs/GLOBE_HUB_RESOURCE.md
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { copy } from "@/lib/copy/human-ko";
import { readPinnedLodgingResourceId } from "@/lib/globe/context-pinned-item";
import type { HubAction } from "@/lib/globe/resource/hub-action-record";
import { readHubActionLogFromEvent } from "@/lib/globe/resource/context-hub-action-log-metadata";
export type ContextRecallSummary = {
  readonly confirmedCount: number;
  readonly hasLodging: boolean;
  readonly hasFlight: boolean;
};

// Keep this module inside the "life-read" boundary:
// - Avoid importing resource helpers that statically import the event-store.
// - Read only from `event.metadata` keys (durable/session Reality-backed data).
const CONTEXT_COMMITTED_RESOURCES_META_KEY = "contextCommittedResources";

function readActionLog(
  event: EventCandidate | null | undefined,
  hubActionLog?: readonly HubAction[],
): readonly HubAction[] {
  if (hubActionLog) {
    return hubActionLog;
  }
  return readHubActionLogFromEvent(event);
}

function hasSuccessfulHubAction(
  log: readonly HubAction[],
  hubId: "lodging" | "flight",
): boolean {
  return log.some((row) => {
    return (
      row.sourceHubId === hubId &&
      (row.type === "reserve" || row.type === "purchase") &&
      row.status === "success"
    );
  });
}
/** Count confirmed lodging + flight legs for a Context (max 2 for P0 trip frame). */
export function summarizeContextRecall(
  event: EventCandidate | null | undefined,
  hubActionLog?: readonly HubAction[],
): ContextRecallSummary {
  if (!event) {
    return { confirmedCount: 0, hasLodging: false, hasFlight: false };
  }

  const actionLog = readActionLog(event, hubActionLog);

  const committedRaw = event.metadata?.[CONTEXT_COMMITTED_RESOURCES_META_KEY];
  const committed = Array.isArray(committedRaw) ? committedRaw : [];

  const hasLodgingCommitted = committed.some((row) => {
    if (!row || typeof row !== "object") {
      return false;
    }
    const r = row as Record<string, unknown>;
    return r.kind === "lodging_voucher";
  });

  const hasFlightCommitted = committed.some((row) => {
    if (!row || typeof row !== "object") {
      return false;
    }
    const r = row as Record<string, unknown>;
    return r.kind === "flight";
  });

  const hasPinnedLodging = Boolean(readPinnedLodgingResourceId(event));

  const hasLodging =
    hasLodgingCommitted ||
    hasPinnedLodging ||
    hasSuccessfulHubAction(actionLog, "lodging");
  const hasFlight =
    hasFlightCommitted || hasSuccessfulHubAction(actionLog, "flight");
  const confirmedCount = (hasLodging ? 1 : 0) + (hasFlight ? 1 : 0);
  return { confirmedCount, hasLodging, hasFlight };
}

export function formatContextRecallBadgeLabel(
  summary: ContextRecallSummary,
): string | null {
  if (summary.confirmedCount <= 0) {
    return null;
  }
  return copy.globe.contextRecallBadge(summary.confirmedCount);
}

export function formatContextRecallDetailLabel(
  summary: ContextRecallSummary,
): string | null {
  if (summary.confirmedCount <= 0) {
    return null;
  }
  const parts: string[] = [];
  if (summary.hasLodging) {
    parts.push(copy.globe.contextRecallLodgingLeg);
  }
  if (summary.hasFlight) {
    parts.push(copy.globe.contextRecallFlightLeg);
  }
  if (parts.length === 0) {
    return formatContextRecallBadgeLabel(summary);
  }
  return parts.join(" · ");
}
