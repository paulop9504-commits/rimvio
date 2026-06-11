import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import type {
  ExperienceBridgeState,
  ExperienceBridgeTimelineItem,
} from "@/lib/experience-bridge/experience-bridge-types";

async function parseJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : response.statusText);
  }
  return body;
}

export async function fetchExperienceBridgeRemote(eventId: string): Promise<{
  state: ExperienceBridgeState | null;
  timeline: ExperienceBridgeTimelineItem[];
}> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(eventId)}`;
  return parseJson(await fetch(endpoint, { credentials: "include" }));
}

export async function bootstrapExperienceBridgeRemote(input: {
  event: EventCandidate;
  peerThreadId?: string | null;
  hostDisplayName?: string;
}): Promise<{ state: ExperienceBridgeState }> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(input.event.id)}`;
  return parseJson(
    await fetch(endpoint, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bootstrap",
        primaryEvent: input.event,
        peerThreadId: input.peerThreadId,
        hostDisplayName: input.hostDisplayName,
      }),
    }),
  );
}

export async function inviteExperienceBridgeRemote(input: {
  eventId: string;
  event?: EventCandidate;
  peerThreadId?: string | null;
  hostDisplayName?: string;
  participantUserId: string;
  participantDisplayName: string;
}): Promise<{ state: ExperienceBridgeState }> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(input.eventId)}`;
  return parseJson(
    await fetch(endpoint, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "invite",
        primaryEvent: input.event,
        peerThreadId: input.peerThreadId,
        hostDisplayName: input.hostDisplayName,
        participantUserId: input.participantUserId,
        participantDisplayName: input.participantDisplayName,
      }),
    }),
  );
}

export async function acceptExperienceBridgeRemote(eventId: string): Promise<{
  state: ExperienceBridgeState;
  pinSpec: { bridge: ExperienceBridgeState["bridge"]; peerThreadId: string | null };
}> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(eventId)}/accept`;
  return parseJson(
    await fetch(endpoint, {
      method: "POST",
      credentials: "include",
    }),
  );
}

export async function leaveExperienceBridgeRemote(eventId: string): Promise<{
  state: ExperienceBridgeState;
}> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(eventId)}/leave`;
  return parseJson(
    await fetch(endpoint, {
      method: "POST",
      credentials: "include",
    }),
  );
}

export async function declineExperienceBridgeRemote(eventId: string): Promise<{
  state: ExperienceBridgeState;
}> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(eventId)}/decline`;
  return parseJson(
    await fetch(endpoint, {
      method: "POST",
      credentials: "include",
    }),
  );
}

export async function fetchPendingBridgeInvitesRemote(): Promise<{
  invites: Array<{
    state: ExperienceBridgeState;
    invite: ExperienceBridgeState["participants"][number];
  }>;
}> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/invites`;
  return parseJson(await fetch(endpoint, { credentials: "include" }));
}

export type PeerThreadMemberRow = {
  userId: string;
  displayName: string;
};

export async function fetchPeerThreadMembersRemote(
  threadId: string,
): Promise<PeerThreadMemberRow[]> {
  const endpoint = `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(threadId)}/members`;
  const data = await parseJson<{ members: PeerThreadMemberRow[] }>(
    await fetch(endpoint, { credentials: "include" }),
  );
  return data.members ?? [];
}
