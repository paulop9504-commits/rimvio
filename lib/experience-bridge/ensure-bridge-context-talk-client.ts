"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ExperienceBridgeState } from "@/lib/experience-bridge/experience-bridge-types";
import { invalidateBridgeApiCache } from "@/lib/experience-bridge/bridge-api-cache";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import { buildBridgeContextThreadId } from "@/lib/peer-chat/bridge-context-thread";
import { buildBridgeSnapshot } from "@/lib/experience-bridge/merge-bridge-timeline";
import { createInitialBridgeState } from "@/lib/experience-bridge/bridge-mutations";
import {
  readLocalBridgeState,
  writeLocalBridgeState,
} from "@/lib/experience-bridge/local-bridge-store";
import { stampBridgeEventMetadata } from "@/lib/experience-bridge/stamp-bridge-event-metadata";

export async function ensureBridgeContextTalkRemote(input: {
  eventId: string;
  primaryEvent?: EventCandidate | null;
  talkTitle?: string | null;
  hostDisplayName?: string;
}): Promise<{ threadId: string; state: ExperienceBridgeState; createdThread: boolean }> {
  const key = input.eventId.trim();
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(key)}/talk`;
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      primaryEvent: input.primaryEvent ?? undefined,
      talkTitle: input.talkTitle ?? undefined,
      hostDisplayName: input.hostDisplayName,
    }),
  });
  const body = (await response.json()) as {
    threadId?: string;
    createdThread?: boolean;
    state?: ExperienceBridgeState;
    error?: string;
  };
  if (!response.ok || !body.threadId || !body.state) {
    throw new Error(body.error ?? "bridge_talk_ensure_failed");
  }
  invalidateBridgeApiCache(key);
  writeLocalBridgeState(body.state);
  return {
    threadId: body.threadId,
    state: body.state,
    createdThread: Boolean(body.createdThread),
  };
}

export function ensureBridgeContextTalkLocal(input: {
  event: EventCandidate;
  hostUserId: string;
  hostDisplayName: string;
  talkTitle?: string | null;
}): { threadId: string; state: ExperienceBridgeState } {
  const threadId = buildBridgeContextThreadId(input.event.id);
  const existing = readLocalBridgeState(input.event.id);
  const bridge = existing?.bridge ??
    buildBridgeSnapshot({
      event: input.event,
      hostUserId: input.hostUserId,
      peerThreadId: threadId,
    });
  const nextBridge = { ...bridge, peerThreadId: threadId };
  const state =
    existing ??
    createInitialBridgeState({
      bridge: nextBridge,
      hostDisplayName: input.hostDisplayName,
    });
  const nextState: ExperienceBridgeState = {
    ...state,
    bridge: nextBridge,
  };
  writeLocalBridgeState(nextState);
  stampBridgeEventMetadata({
    event: input.event,
    bridge: nextBridge,
    role: "host",
  });
  return { threadId, state: nextState };
}
