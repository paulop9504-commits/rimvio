import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import { cachedFetchJson } from "@/lib/http/client-fetch-cache";
import {
  isClientAuthCircuitOpen,
  noteClientAuthFailure,
} from "@/lib/http/client-auth-circuit";
import {
  maxIsoTimestamp,
  readBridgeSyncCursor,
  writeBridgeSyncCursor,
} from "@/lib/experience-bridge/bridge-sync-cursor-store";
import {
  BRIDGE_CONTRIBUTIONS_CACHE_MS,
  BRIDGE_INVITES_CACHE_KEY,
  BRIDGE_INVITES_CACHE_MS,
  BRIDGE_PLAN_CACHE_MS,
  bridgeContributionsCacheKey,
  bridgePlanCacheKey,
  invalidateBridgeApiCache,
} from "@/lib/experience-bridge/bridge-api-cache";
import type {
  ExperienceBridgeContribution,
  ExperienceBridgeState,
  ExperienceBridgeTimelineItem,
} from "@/lib/experience-bridge/experience-bridge-types";
import type { ExperienceWindow } from "@/lib/experience-window/experience-window-types";

async function parseJson<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    noteClientAuthFailure();
    throw new Error("authentication required");
  }
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : response.statusText);
  }
  return body;
}

async function fetchJsonUncached<T>(
  endpoint: string,
  init?: RequestInit,
): Promise<T> {
  if (isClientAuthCircuitOpen()) {
    throw new Error("auth_circuit_open");
  }
  return parseJson<T>(await fetch(endpoint, { credentials: "include", ...init }));
}

export async function fetchExperienceBridgeRemote(
  eventId: string,
  options?: { fresh?: boolean },
): Promise<{
  state: ExperienceBridgeState | null;
  timeline: ExperienceBridgeTimelineItem[];
  contributions: ExperienceBridgeContribution[];
  experienceWindow?: ExperienceWindow | null;
}> {
  const key = eventId.trim();
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(key)}`;
  if (options?.fresh) {
    return fetchJsonUncached(endpoint);
  }
  return cachedFetchJson(bridgePlanCacheKey(key), () => fetchJsonUncached(endpoint), BRIDGE_PLAN_CACHE_MS);
}

export async function fetchBridgeContributionsRemote(
  eventId: string,
  options?: { fresh?: boolean; sinceIso?: string | null },
): Promise<ExperienceBridgeContribution[]> {
  const key = eventId.trim();
  const since =
    options?.sinceIso?.trim() ||
    (options?.fresh ? null : readBridgeSyncCursor(key));
  const query = since ? `?since=${encodeURIComponent(since)}` : "";
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(key)}/contributions${query}`;

  const load = async () => {
    const body = await fetchJsonUncached<{
      contributions?: ExperienceBridgeContribution[];
      serverTime?: string;
    }>(endpoint);
    const contributions = body.contributions ?? [];
    const latest = contributions.reduce<string | null>((acc, row) => {
      return maxIsoTimestamp(acc, row.createdAtIso);
    }, since);
    writeBridgeSyncCursor(key, latest ?? body.serverTime ?? new Date().toISOString());
    return contributions;
  };

  if (options?.fresh || since) {
    return load();
  }
  return cachedFetchJson(
    bridgeContributionsCacheKey(key),
    load,
    BRIDGE_CONTRIBUTIONS_CACHE_MS,
  );
}

export async function bootstrapExperienceBridgeRemote(input: {
  event: EventCandidate;
  peerThreadId?: string | null;
  hostDisplayName?: string;
}): Promise<{ state: ExperienceBridgeState }> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(input.event.id)}`;
  const result = await fetchJsonUncached<{ state: ExperienceBridgeState }>(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "bootstrap",
      primaryEvent: input.event,
      peerThreadId: input.peerThreadId,
      hostDisplayName: input.hostDisplayName,
    }),
  });
  invalidateBridgeApiCache(input.event.id);
  return result;
}

export async function inviteExperienceBridgeRemote(input: {
  eventId: string;
  event?: EventCandidate;
  peerThreadId?: string | null;
  hostDisplayName?: string;
  participantUserId: string;
  participantDisplayName: string;
  directDelivery?: boolean;
}): Promise<{ state: ExperienceBridgeState }> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(input.eventId)}`;
  const result = await fetchJsonUncached<{ state: ExperienceBridgeState }>(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "invite",
      primaryEvent: input.event,
      peerThreadId: input.peerThreadId,
      hostDisplayName: input.hostDisplayName,
      participantUserId: input.participantUserId,
      participantDisplayName: input.participantDisplayName,
      directDelivery: input.directDelivery === true,
    }),
  });
  invalidateBridgeApiCache(input.eventId);
  return result;
}

export async function updateExperienceBridgePinnedItemRemote(input: {
  event: EventCandidate;
}): Promise<{ state: ExperienceBridgeState }> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(input.event.id)}`;
  const result = await fetchJsonUncached<{ state: ExperienceBridgeState }>(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "pin_item",
      primaryEvent: input.event,
    }),
  });
  invalidateBridgeApiCache(input.event.id);
  return result;
}

export async function updateExperienceBridgePlanningTruthRemote(input: {
  event: EventCandidate;
}): Promise<{ state: ExperienceBridgeState }> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(input.event.id)}`;
  const result = await fetchJsonUncached<{ state: ExperienceBridgeState }>(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "planning_truth",
      primaryEvent: input.event,
    }),
  });
  invalidateBridgeApiCache(input.event.id);
  return result;
}

export async function updateExperienceBridgePlanningProposalRemote(input: {
  event: EventCandidate;
}): Promise<{ state: ExperienceBridgeState }> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(input.event.id)}`;
  const result = await fetchJsonUncached<{ state: ExperienceBridgeState }>(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "planning_proposal",
      primaryEvent: input.event,
    }),
  });
  invalidateBridgeApiCache(input.event.id);
  return result;
}

export async function acceptExperienceBridgeRemote(eventId: string): Promise<{
  state: ExperienceBridgeState;
  pinSpec: { bridge: ExperienceBridgeState["bridge"]; peerThreadId: string | null };
}> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(eventId)}/accept`;
  const result = await fetchJsonUncached<{
    state: ExperienceBridgeState;
    pinSpec: { bridge: ExperienceBridgeState["bridge"]; peerThreadId: string | null };
  }>(endpoint, { method: "POST" });
  invalidateBridgeApiCache(eventId);
  return result;
}

export async function leaveExperienceBridgeRemote(eventId: string): Promise<{
  state: ExperienceBridgeState;
}> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(eventId)}/leave`;
  const result = await fetchJsonUncached<{ state: ExperienceBridgeState }>(endpoint, {
    method: "POST",
  });
  invalidateBridgeApiCache(eventId);
  return result;
}

export async function declineExperienceBridgeRemote(eventId: string): Promise<{
  state: ExperienceBridgeState;
}> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(eventId)}/decline`;
  const result = await fetchJsonUncached<{ state: ExperienceBridgeState }>(endpoint, {
    method: "POST",
  });
  invalidateBridgeApiCache(eventId);
  return result;
}

export async function fetchPendingBridgeInvitesRemote(): Promise<{
  invites: Array<{
    state: ExperienceBridgeState;
    invite: ExperienceBridgeState["participants"][number];
  }>;
}> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/invites`;
  return cachedFetchJson(
    BRIDGE_INVITES_CACHE_KEY,
    () => fetchJsonUncached(endpoint),
    BRIDGE_INVITES_CACHE_MS,
  );
}

export type PeerThreadMemberRow = {
  userId: string;
  displayName: string;
};

export async function fetchPeerThreadMembersRemote(
  threadId: string,
): Promise<PeerThreadMemberRow[]> {
  const endpoint = `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(threadId)}/members`;
  const data = await fetchJsonUncached<{ members: PeerThreadMemberRow[] }>(endpoint);
  return data.members ?? [];
}

export { invalidateBridgeApiCache };
