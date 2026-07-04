import type { EventCandidate } from "@/lib/events/event-candidate";
import { readCanonicalPlaceProfileFromEvent } from "@/lib/globe/canonical-place-profile";
import { findPersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export function resolveContextPlaceLabel(event: EventCandidate): string {
  const pin = findPersonalGlobePinByEventId(event.id);
  const profile = readCanonicalPlaceProfileFromEvent(event);
  const plan = readPlanContextFromEvent(event);
  return (
    profile?.label?.trim() ||
    pin?.placeLabel?.trim() ||
    plan?.place?.trim() ||
    event.place?.trim() ||
    event.title.trim()
  );
}
