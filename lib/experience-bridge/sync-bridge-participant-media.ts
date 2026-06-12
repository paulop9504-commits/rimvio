"use client";

import { fetchExperienceBridgeRemote } from "@/lib/experience-bridge/experience-bridge-client";
import { EXPERIENCE_BRIDGE_META_KEYS } from "@/lib/experience-bridge/constants";
import { readLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import {
  mergeBridgeContributionsIntoEvent,
  mergeBridgeRemoteCaptureUrls,
} from "@/lib/experience-bridge/merge-bridge-shared-media";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";

function isBridgeLinkedEvent(eventId: string): boolean {
  const key = eventId.trim();
  if (!key) {
    return false;
  }
  if (readLocalBridgeState(key)) {
    return true;
  }
  const event = findLifeEventCandidate(key);
  if (!event) {
    return false;
  }
  if (event.metadata?.experienceBridgeParticipant === true) {
    return true;
  }
  return typeof event.metadata?.[EXPERIENCE_BRIDGE_META_KEYS.bridgeId] === "string";
}

/** Bridge pin open — merge snapshot urls + other members' contributions. */
export async function syncBridgeSharedMediaFromRemote(
  eventId: string,
  viewerUserId?: string | null,
): Promise<EventCandidate | null> {
  const key = eventId.trim();
  if (!key || !isBridgeLinkedEvent(key)) {
    return null;
  }

  const local = findLifeEventCandidate(key);
  const remote = await fetchExperienceBridgeRemote(key);
  if (!remote.state?.bridge.eventSnapshot) {
    return null;
  }

  let event = local ?? remote.state.bridge.eventSnapshot;
  const urlMerged = mergeBridgeRemoteCaptureUrls({
    event,
    remoteEvent: remote.state.bridge.eventSnapshot,
  });
  if (urlMerged) {
    event = urlMerged;
  }

  const contributionMerged = mergeBridgeContributionsIntoEvent({
    event,
    contributions: remote.contributions ?? [],
    viewerUserId,
  });
  if (contributionMerged) {
    event = contributionMerged;
  }

  return contributionMerged ?? urlMerged;
}

/** @deprecated use syncBridgeSharedMediaFromRemote */
export async function syncBridgeParticipantMediaFromRemote(
  eventId: string,
): Promise<EventCandidate | null> {
  return syncBridgeSharedMediaFromRemote(eventId);
}
