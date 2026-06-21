import type { EventCandidate } from "@/lib/events/event-candidate";
import type { BridgeContributionCapture } from "@/lib/experience-bridge/bridge-capture-spacetime";
import { FEED_CAPTURES_META_KEY } from "@/lib/feed/feed-capture-types";
import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { upsertBridgeContribution } from "@/lib/experience-bridge/server-bridge-contributions";
import {
  fetchExperienceBridgeState,
  updateBridgeEventSnapshot,
} from "@/lib/experience-bridge/server-bridge-store";
import { resolveServiceRoleOrUserClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

function mergeCaptureIntoSnapshot(
  event: EventCandidate,
  capture: FeedCaptureFragment,
): EventCandidate {
  const fragments = readFeedCaptureFragments(event);
  const captureId = capture.id.trim();
  const index = fragments.findIndex(
    (row) =>
      row.id === captureId || row.mediaContextId?.trim() === captureId,
  );
  const next =
    index >= 0
      ? fragments.map((row, i) => (i === index ? { ...row, ...capture } : row))
      : [...fragments, capture];

  return {
    ...event,
    metadata: {
      ...event.metadata,
      [FEED_CAPTURES_META_KEY]: next,
    },
  };
}

/** Persist contribution — service role upsert (RLS-safe) + host snapshot refresh. */
export async function serverSaveBridgeContribution(input: {
  userClient: SupabaseClient;
  bridgeEventId: string;
  contributorUserId: string;
  capture: BridgeContributionCapture & {
    ownerUserId?: string;
    authorDisplayName?: string;
    authorAvatarUrl?: string;
  };
}): Promise<void> {
  const bridgeEventId = input.bridgeEventId.trim();
  const capture = {
    ...input.capture,
    ownerUserId: input.contributorUserId,
  };

  const writeClient = resolveServiceRoleOrUserClient(input.userClient);

  await upsertBridgeContribution(writeClient, {
    bridgeEventId,
    contributorUserId: input.contributorUserId,
    capture,
  });

  const state = await fetchExperienceBridgeState(input.userClient, bridgeEventId);
  if (!state) {
    return;
  }

  if (state.bridge.hostUserId !== input.contributorUserId) {
    return;
  }

  const snapshot = mergeCaptureIntoSnapshot(state.bridge.eventSnapshot, capture);
  await updateBridgeEventSnapshot(writeClient, snapshot);
}
