/**
 * Read WorkspaceKind for an open Context — drives New Intent → New Context (ADR-029).
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import type { WorkspaceKind } from "@/lib/workspace-kind/types";

function kindFromEvent(event: EventCandidate): WorkspaceKind | null {
  const meta = event.metadata ?? {};
  const stamped = meta.workspaceKind;
  if (stamped === "travel" || stamped === "driver" || stamped === "used_goods") {
    return stamped;
  }
  const title = event.title.trim();
  if (/판매|구매|중고|거래/u.test(title) || meta.marketRole != null) {
    return "used_goods";
  }
  if (/대리|드라이버|daeri/iu.test(title)) {
    return "driver";
  }
  if (
    event.category === "travel" ||
    /여행|출장|맛집|숙소|trip|호텔/iu.test(title)
  ) {
    return "travel";
  }
  return null;
}

/** Active Context → WorkspaceKind (null = unknown / generic hub). */
export function resolveActiveWorkspaceKind(
  contextEventId: string | null | undefined,
): WorkspaceKind | null {
  const id = contextEventId?.trim();
  if (!id) return null;
  const event = findLifeEventCandidate(id);
  if (!event) return null;
  return kindFromEvent(event);
}

/**
 * Lodging/eatery scout may stay on the open Context only for travel frames.
 * Market / driver Context + hotel search → New Context (intent switch).
 */
export function activeContextAllowsDomainScout(
  activeWorkspaceKind: WorkspaceKind | null | undefined,
): boolean {
  if (activeWorkspaceKind === "used_goods" || activeWorkspaceKind === "driver") {
    return false;
  }
  // travel or unknown (legacy trip hub) — continue in place
  return true;
}
