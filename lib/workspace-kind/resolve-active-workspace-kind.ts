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
    meta.globeManualContext === true ||
    meta.targetingSource === "experience_run" ||
    meta.executionProfileId === "leisure_travel" ||
    meta.executionProfileId === "business_trip" ||
    meta.executionProfileId === "lodging_search" ||
    meta.executionProfileId === "eatery_search" ||
    typeof meta.travelDestination === "string" ||
    /여행|출장|맛집|숙소|trip|호텔/iu.test(title) ||
    /^(?:오사카|도쿄|후쿠오카|교토|나고야|삿포로|오키나와|제주|부산|서울|파리|뉴욕|방콕|다낭|타이베이|세부|발리|마닐라)/u.test(
      title,
    )
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
