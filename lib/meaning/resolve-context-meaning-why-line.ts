/**
 * One MEANING why-line for Plan / candidates ("민수 = 제주").
 * Phase 2 micro-surface — not a graph explorer.
 */

import { resolveSlotMeaningLabel } from "@/lib/feed/resolve-slot-meaning-label";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

function collectPeopleLabels(event: EventCandidate): string[] {
  const plan = readPlanContextFromEvent(event);
  const meta = event.metadata ?? {};
  const labels: string[] = [];
  for (const value of [
    plan?.peerDisplayName,
    typeof meta.planPeerDisplayName === "string" ? meta.planPeerDisplayName : null,
    typeof meta.peerDisplayName === "string" ? meta.peerDisplayName : null,
  ]) {
    const name = value?.trim();
    if (name && !labels.includes(name)) {
      labels.push(name);
    }
  }
  return labels;
}

function collectPlaceLabels(event: EventCandidate): string[] {
  const plan = readPlanContextFromEvent(event);
  const place = plan?.place?.trim() || event.place?.trim() || "";
  const cleaned = place.replace(/\s*여행$/u, "").trim() || place;
  return cleaned ? [cleaned] : [];
}

/** Pure — strongest why-line for this Context against the meaning graph corpus. */
export function resolveContextMeaningWhyLine(input: {
  event: EventCandidate | null | undefined;
  events: readonly EventCandidate[];
}): string | null {
  const event = input.event;
  if (!event) {
    return null;
  }
  const corpus = input.events.some((row) => row.id === event.id)
    ? input.events
    : [event, ...input.events];
  return resolveSlotMeaningLabel({
    events: corpus,
    peopleLabels: collectPeopleLabels(event),
    placeLabels: collectPlaceLabels(event),
  });
}

/** Prefix candidate / plan reason with meaning why when present. */
export function decorateReasonWithMeaningWhy(
  meaningWhy: string | null | undefined,
  reasonKo: string,
): string {
  const meaning = meaningWhy?.trim() ?? "";
  const reason = reasonKo.trim();
  if (!meaning) {
    return reason;
  }
  if (!reason) {
    return meaning;
  }
  if (reason.includes(meaning)) {
    return reason;
  }
  return `${meaning} · ${reason}`;
}
