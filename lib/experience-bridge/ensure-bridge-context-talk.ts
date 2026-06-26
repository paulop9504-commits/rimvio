import type { EventCandidate } from "@/lib/events/event-candidate";
import { canReadBridgeExperience } from "@/lib/experience-bridge/bridge-access";
import { createInitialBridgeState } from "@/lib/experience-bridge/bridge-mutations";
import { buildBridgeSnapshot } from "@/lib/experience-bridge/merge-bridge-timeline";
import type { ExperienceBridgeState } from "@/lib/experience-bridge/experience-bridge-types";
import {
  fetchExperienceBridgeState,
  patchBridgePeerThreadId,
  upsertExperienceBridge,
} from "@/lib/experience-bridge/server-bridge-store";
import { callerCanAccessPeerThread } from "@/lib/peer-chat/caller-peer-thread-access";
import { buildBridgeContextThreadId } from "@/lib/peer-chat/bridge-context-thread";
import { ensureBridgeContextPeerThread } from "@/lib/peer-chat/server-peer-chat";
import type { SupabaseClient } from "@supabase/supabase-js";

function isEventCandidate(value: unknown): value is EventCandidate {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Partial<EventCandidate>;
  return typeof row.id === "string" && typeof row.title === "string";
}

export type EnsureBridgeContextTalkInput = {
  eventId: string;
  userId: string;
  hostDisplayName: string;
  talkTitle?: string | null;
  primaryEvent?: EventCandidate | null;
};

export type EnsureBridgeContextTalkResult = {
  threadId: string;
  state: ExperienceBridgeState;
  createdThread: boolean;
};

function activeBridgeMemberUserIds(
  state: ExperienceBridgeState,
  callerUserId: string,
): string[] {
  const ids = new Set<string>();
  for (const row of state.participants) {
    if (row.role === "host" || row.status === "accepted") {
      ids.add(row.userId.trim());
    }
  }
  ids.add(callerUserId.trim());
  return [...ids].filter(Boolean);
}

/** Ensure a bridge-scoped talk thread exists and is linked on the experience bridge. */
export async function ensureBridgeContextTalk(
  supabase: SupabaseClient,
  input: EnsureBridgeContextTalkInput,
): Promise<EnsureBridgeContextTalkResult> {
  const eventId = input.eventId.trim();
  const userId = input.userId.trim();
  if (!eventId || !userId) {
    throw new Error("event_and_user_required");
  }

  let state = await fetchExperienceBridgeState(supabase, eventId);
  const existingThreadId = state?.bridge.peerThreadId?.trim() || null;

  if (
    existingThreadId &&
    (await callerCanAccessPeerThread(supabase, existingThreadId, userId))
  ) {
    return {
      threadId: existingThreadId,
      state: state!,
      createdThread: false,
    };
  }

  if (!state) {
    if (!isEventCandidate(input.primaryEvent) || input.primaryEvent.id !== eventId) {
      throw new Error("bridge_bootstrap_required");
    }
    const bridge = buildBridgeSnapshot({
      event: input.primaryEvent,
      hostUserId: userId,
      peerThreadId: null,
    });
    state = createInitialBridgeState({
      bridge,
      hostDisplayName: input.hostDisplayName.trim() || "나",
    });
    await upsertExperienceBridge(supabase, {
      bridge: state.bridge,
      hostParticipant: state.participants[0]!,
    });
    state = (await fetchExperienceBridgeState(supabase, eventId)) ?? state;
  }

  if (
    !canReadBridgeExperience({
      viewerUserId: userId,
      participants: state.participants,
      hostUserId: state.bridge.hostUserId,
    })
  ) {
    throw new Error("forbidden");
  }

  const threadId = buildBridgeContextThreadId(eventId);
  const displayName =
    input.talkTitle?.trim() ||
    state.bridge.title?.trim() ||
    input.primaryEvent?.title?.trim() ||
    "맥락 톡";

  const memberUserIds = activeBridgeMemberUserIds(state, userId).filter(
    (id) => id !== state!.bridge.hostUserId,
  );

  const ensured = await ensureBridgeContextPeerThread(supabase, {
    eventId,
    threadId,
    displayName,
    ownerUserId: state.bridge.hostUserId,
    memberUserIds,
  });

  await patchBridgePeerThreadId(supabase, eventId, threadId);
  const next = await fetchExperienceBridgeState(supabase, eventId);
  if (!next) {
    throw new Error("bridge_talk_link_failed");
  }

  return {
    threadId,
    state: next,
    createdThread: ensured.created,
  };
}
