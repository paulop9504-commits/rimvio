"use client";

import { fetchExperienceBridgeRemote, fetchBridgeContributionsRemote } from "@/lib/experience-bridge/experience-bridge-client";
import { resolveBridgePublishRole } from "@/lib/experience-bridge/ensure-bridge-link-before-publish";
import { resolveBridgeContributionsForSync } from "@/lib/experience-bridge/resolve-bridge-contributions-for-sync";
import {
  mergeBridgeContributionsIntoEvent,
  mergeBridgeRemoteCaptureUrls,
} from "@/lib/experience-bridge/merge-bridge-shared-media";
import type { ExperienceBridgeContribution } from "@/lib/experience-bridge/experience-bridge-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { mergePinnedContextItemFromRemote } from "@/lib/globe/context-pinned-item";
import { mergeBridgePlanningTruthFromRemote } from "@/lib/bridge-planning";
import { mergeBridgePlanningProposalFromRemote } from "@/lib/bridge-planning/merge-bridge-planning-proposal";
import {
  notifyBridgePlanningSyncFeedback,
  resolveBridgePlanningSyncFeedback,
} from "@/lib/bridge-planning/planning-sync-feedback";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { stampBridgeEventMetadata } from "@/lib/experience-bridge/stamp-bridge-event-metadata";
import {
  readBridgeSyncPhase,
  setBridgeSyncPhase,
} from "@/lib/experience-bridge/bridge-sync-session";
import { createClient } from "@/lib/supabase/client";

async function resolveBridgeSyncViewerUserId(
  viewerUserId?: string | null,
): Promise<string | null> {
  const passed = viewerUserId?.trim();
  if (passed) {
    return passed;
  }
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id?.trim() || null;
  } catch {
    return null;
  }
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
    remote = await fetchExperienceBridgeRemote(key, { fresh: true });
  } catch {
    return null;
  }

  if (!remote.state?.bridge.eventSnapshot) {
    return null;
  }

  setBridgeSyncPhase({ eventId: key, phase: "syncing" });

  try {
  const viewerId = await resolveBridgeSyncViewerUserId(viewerUserId);
  const local = findLifeEventCandidate(key);
  const beforeEvent = local ?? remote.state.bridge.eventSnapshot;
  let event = beforeEvent;
  let changed = false;

  if (viewerId) {
    const base = local ?? remote.state.bridge.eventSnapshot;
    const stamped = stampBridgeEventMetadata({
      event: base,
      bridge: remote.state.bridge,
      role: resolveBridgePublishRole({
        viewerUserId: viewerId,
        hostUserId: remote.state.bridge.hostUserId,
      }),
    });
    if (stamped !== base) {
      changed = true;
    }
    event = stamped;
  }

  const dedicatedContributions = await fetchBridgeContributionsRemote(key, {
    fresh: true,
  }).catch(() => [] as ExperienceBridgeContribution[]);
  const contributions = resolveBridgeContributionsForSync({
    fromPlan: remote.contributions ?? [],
    fromDedicated: dedicatedContributions,
  });

  const urlMerged = mergeBridgeRemoteCaptureUrls({
    event,
    remoteEvent: remote.state.bridge.eventSnapshot,
  });
  if (urlMerged) {
    event = urlMerged;
    changed = true;
  }

  const pinnedMerged = mergePinnedContextItemFromRemote({
    event,
    remoteEvent: remote.state.bridge.eventSnapshot,
  });
  if (pinnedMerged) {
    event = pinnedMerged;
    changed = true;
  }

  const planningMerged = mergeBridgePlanningTruthFromRemote({
    event,
    remoteEvent: remote.state.bridge.eventSnapshot,
  });
  if (planningMerged) {
    event = planningMerged;
    changed = true;
  }

  const proposalMerged = mergeBridgePlanningProposalFromRemote({
    event,
    remoteEvent: remote.state.bridge.eventSnapshot,
  });
  if (proposalMerged) {
    event = proposalMerged;
    changed = true;
  }

  const contributionMerged = mergeBridgeContributionsIntoEvent({
    event,
    contributions,
    viewerUserId: viewerId,
  });
  if (contributionMerged) {
    event = contributionMerged;
    changed = true;
  }

  if (changed && viewerId) {
    const feedback = resolveBridgePlanningSyncFeedback({
      viewerUserId: viewerId,
      beforeEvent,
      afterEvent: event,
    });
    if (feedback) {
      notifyBridgePlanningSyncFeedback(feedback);
    }
  }

  return changed ? event : null;
  } finally {
    if (readBridgeSyncPhase(key) === "syncing") {
      setBridgeSyncPhase({ eventId: key, phase: "idle" });
    }
  }
}

/** @deprecated use syncBridgeSharedMediaFromRemote */
export async function syncBridgeParticipantMediaFromRemote(
  eventId: string,
): Promise<EventCandidate | null> {
  return syncBridgeSharedMediaFromRemote(eventId);
}
