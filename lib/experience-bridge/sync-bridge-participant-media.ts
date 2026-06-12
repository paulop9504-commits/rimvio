"use client";

import { fetchExperienceBridgeRemote } from "@/lib/experience-bridge/experience-bridge-client";
import { mergeBridgeRemoteCaptureUrls } from "@/lib/experience-bridge/hydrate-bridge-event-snapshot";
import { EXPERIENCE_BRIDGE_META_KEYS } from "@/lib/experience-bridge/constants";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";

/** Invitee pin open — merge https photo urls from server bridge snapshot. */
export async function syncBridgeParticipantMediaFromRemote(
  eventId: string,
): Promise<EventCandidate | null> {
  const key = eventId.trim();
  if (!key) {
    return null;
  }

  const local = findLifeEventCandidate(key);
  if (!local?.metadata?.[EXPERIENCE_BRIDGE_META_KEYS.bridgeId]) {
    if (!local?.metadata?.experienceBridgeParticipant) {
      return null;
    }
  }

  const remote = await fetchExperienceBridgeRemote(key);
  if (!remote.state?.bridge.eventSnapshot) {
    return null;
  }

  return mergeBridgeRemoteCaptureUrls({
    event: local ?? remote.state.bridge.eventSnapshot,
    remoteEvent: remote.state.bridge.eventSnapshot,
  });
}
