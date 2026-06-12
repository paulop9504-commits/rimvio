"use client";

import { fetchExperienceBridgeRemote } from "@/lib/experience-bridge/experience-bridge-client";
import {
  mergeBridgeContributionsIntoEvent,
  mergeBridgeRemoteCaptureUrls,
} from "@/lib/experience-bridge/merge-bridge-shared-media";
import type { ExperienceBridgeContribution } from "@/lib/experience-bridge/experience-bridge-types";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";

async function fetchBridgeContributionsRemote(
  eventId: string,
): Promise<ExperienceBridgeContribution[]> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(eventId)}/contributions`;
  const response = await fetch(endpoint, { credentials: "include" });
  if (!response.ok) {
    return [];
  }
  const body = (await response.json()) as {
    contributions?: ExperienceBridgeContribution[];
  };
  return body.contributions ?? [];
}

/** Bridge pin open — merge snapshot urls + all members' contributions from server. */
export async function syncBridgeSharedMediaFromRemote(
  eventId: string,
  viewerUserId?: string | null,
): Promise<EventCandidate | null> {
  const key = eventId.trim();
  if (!key) {
    return null;
  }

  let remote: Awaited<ReturnType<typeof fetchExperienceBridgeRemote>>;
  try {
    remote = await fetchExperienceBridgeRemote(key);
  } catch {
    return null;
  }

  if (!remote.state?.bridge.eventSnapshot) {
    return null;
  }

  const local = findLifeEventCandidate(key);
  const viewerId = viewerUserId?.trim() || null;
  if (local && viewerId && viewerId === remote.state.bridge.hostUserId) {
    stampBridgeEventMetadata({
      event: local,
      bridge: remote.state.bridge,
      role: "host",
    });
  }

  let contributions = remote.contributions ?? [];
  if (contributions.length === 0) {
    contributions = await fetchBridgeContributionsRemote(key);
  }

  const localAfterStamp = findLifeEventCandidate(key);
  let event = localAfterStamp ?? remote.state.bridge.eventSnapshot;

  const urlMerged = mergeBridgeRemoteCaptureUrls({
    event,
    remoteEvent: remote.state.bridge.eventSnapshot,
  });
  if (urlMerged) {
    event = urlMerged;
  }

  const contributionMerged = mergeBridgeContributionsIntoEvent({
    event,
    contributions,
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
