import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  formatContextRecallBadgeLabel,
  summarizeContextRecall,
} from "@/lib/globe/context-hub/summarize-context-recall";
import { readHubActionLogFromEvent } from "@/lib/globe/resource/context-hub-action-log-metadata";
import { readHubActionLog } from "@/lib/globe/resource/hub-action-record-store";
import { readContextAnchorProgressPercent } from "@/lib/context-workspace/try-open-context-anchor-workspace";

function shouldShowRecallBadge(pin: ClassifiedGlobePin): boolean {
  if (
    pin.pinShape === "cluster" ||
    pin.pinShape === "viewer" ||
    pin.pinShape === "market" ||
    pin.marketRole ||
    pin.hubFocusMuted
  ) {
    return false;
  }
  if (pin.tripLeg === "destination") {
    return true;
  }
  return pin.emphasis === "primary" && !pin.tripLeg;
}

/** Session + durable on client; durable-only on server (Day 2 cold start). */
function readRecallHubActionLog(
  event: EventCandidate | null | undefined,
): ReturnType<typeof readHubActionLogFromEvent> {
  const eventId = event?.id?.trim();
  if (!eventId) {
    return [];
  }
  if (typeof window !== "undefined") {
    return [...readHubActionLog(eventId)];
  }
  return readHubActionLogFromEvent(event);
}

/** Attach recall badge label to destination / primary context pins. */
export function enrichGlobePinRecallBadges(
  pins: readonly ClassifiedGlobePin[],
  eventsById: ReadonlyMap<string, EventCandidate>,
): ClassifiedGlobePin[] {
  return pins.map((pin) => {
    if (!shouldShowRecallBadge(pin)) {
      return pin;
    }
    const eventId = pin.sourceEventId?.trim();
    if (!eventId) {
      return pin;
    }
    const event = eventsById.get(eventId);
    const hubActionLog = readRecallHubActionLog(event);
    const recallBadgeLabel = formatContextRecallBadgeLabel(
      summarizeContextRecall(event, hubActionLog),
    );
    // Context Anchor chrome: Workspace progress when no Day-2 recall count.
    const progress =
      recallBadgeLabel == null
        ? readContextAnchorProgressPercent(eventId)
        : null;
    const badge =
      recallBadgeLabel ??
      (progress != null ? `${progress}%` : null);
    if (!badge) {
      return pin;
    }
    return { ...pin, recallBadgeLabel: badge };
  });
}
