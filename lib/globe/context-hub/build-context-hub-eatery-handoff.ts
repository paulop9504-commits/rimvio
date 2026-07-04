import type { EventCandidate } from "@/lib/events/event-candidate";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";

export type ContextHubEateryHandoff = {
  href: string;
  actionLabelKo: string;
  searchQuery: string;
};

function resolveBaseQuery(event: EventCandidate): string {
  const pin = findPersonalGlobePinByEventId(event.id);
  const plan = readPlanContextFromEvent(event);
  const place =
    pin?.placeLabel?.trim() ||
    plan?.place?.trim() ||
    event.place?.trim() ||
    "";
  const title = event.title.trim();
  const core = place || title || "맥락";
  if (/맛집|식당|카페/u.test(core)) {
    return core;
  }
  return `${core} 맛집`;
}

/** Context-bound eatery ingress — opens Search tab with contextual restaurant query primed. */
export function buildContextHubEateryHandoff(
  event: EventCandidate,
): ContextHubEateryHandoff {
  const searchQuery = resolveBaseQuery(event);
  const params = new URLSearchParams({
    contextEventId: event.id,
    q: searchQuery,
  });
  return {
    href: `/search?${params.toString()}`,
    actionLabelKo: "맛집 찾기",
    searchQuery,
  };
}
