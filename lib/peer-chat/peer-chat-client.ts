import type { PeerMessage } from "@/lib/context/peer-message-types";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";

import { friendContactErrorMessage } from "@/lib/peer-chat/friend-contact-errors";

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & {
    error?: string;
    message?: string;
  };
  if (!response.ok) {
    const raw =
      data.message ??
      data.error ??
      (typeof data === "object" &&
      data !== null &&
      "details" in data &&
      typeof (data as { details?: unknown }).details === "string"
        ? (data as { details: string }).details
        : undefined) ??
      `Request failed (${response.status})`;
    throw new Error(friendContactErrorMessage(String(raw)));
  }
  return data;
}

/** True when thread was opened via registered-user DM add flow. */
export function isRegisteredPeerDmThread(threadId: string): boolean {
  return threadId.startsWith("peer-dm-") && threadId.includes("__");
}

export type PeerPublicProfile = {
  userId: string;
  displayName: string | null;
  rimvioId: string | null;
  avatarUrl: string | null;
  emailLower: string | null;
};

export async function fetchRelationshipFeedSlots(): Promise<{
  slots: import("@/lib/social/relationship-slot-types").RelationshipFeedSlot[];
}> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/feed/slots`, {
    credentials: "include",
  });
  return parseJson(response);
}

/** 관계 버블 DM → 피드 슬롯으로 당기기 (메시지 있을 때). */
export async function syncFeedSlotFromRoomRemote(
  roomId: string,
): Promise<{ ok: boolean; synced: boolean }> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/feed/slots/sync`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ roomId }),
    },
  );
  return parseJson(response);
}

export async function pinFeedSlotRemote(input: {
  roomId: string;
  pinned: boolean;
}): Promise<{ ok: boolean }> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/feed/slots/pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function fetchSocialLayer(): Promise<{
  pinned: import("@/lib/social/bubble-state").SocialBubblePeer[];
  archive: import("@/lib/social/bubble-state").SocialBubblePeer[];
}> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/social/layer`, {
    credentials: "include",
  });
  return parseJson(response);
}

export async function pinFriendRemote(input: {
  friendId: string;
  pinSlot: number;
}): Promise<{ ok: boolean }> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/social/pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function unpinFriendRemote(input: {
  friendId: string;
}): Promise<{ ok: boolean }> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/social/unpin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function markPeerThreadReadRemote(threadId: string): Promise<void> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/social/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ threadId }),
  });
  await parseJson(response);
}

export async function fetchDmPeerPublicProfile(
  threadId: string,
): Promise<PeerPublicProfile> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(threadId)}/peer-profile`,
    { credentials: "include" },
  );
  const data = await parseJson<{ profile: PeerPublicProfile }>(response);
  return data.profile;
}

export async function ensurePeerThreadRemote(input: {
  threadId: string;
  displayName: string;
}): Promise<{ threadId: string; inviteCode: string; displayName: string }> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/threads/ensure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function fetchPeerThreadMeta(threadId: string): Promise<{
  threadId: string;
  inviteCode: string;
  displayName: string;
}> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(threadId)}`,
    { credentials: "include" },
  );
  return parseJson(response);
}

export async function fetchPeerMessages(threadId: string): Promise<PeerMessage[]> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(threadId)}/messages`,
    { credentials: "include" },
  );
  const data = await parseJson<{ messages: PeerMessage[] }>(response);
  return data.messages;
}

export async function invokePeerRoomAi(input: {
  threadId: string;
  displayName: string;
  prompt: string;
}): Promise<PeerMessage> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(input.threadId)}/ai`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        prompt: input.prompt,
        displayName: input.displayName,
      }),
    },
  );
  const data = await parseJson<{ message: PeerMessage }>(response);
  return data.message;
}

export async function sendPeerImageRemote(input: {
  threadId: string;
  displayName: string;
  file: File;
  caption?: string;
}): Promise<PeerMessage> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("displayName", input.displayName);
  if (input.caption?.trim()) {
    form.append("caption", input.caption.trim());
  }
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(input.threadId)}/messages/image`,
    {
      method: "POST",
      credentials: "include",
      body: form,
    },
  );
  const data = await parseJson<{ message: PeerMessage }>(response);
  return data.message;
}

export async function sendPeerMessageRemote(input: {
  threadId: string;
  displayName: string;
  body: string;
}): Promise<PeerMessage> {
  const response = await fetch(
    `${resolveAppOrigin()}/api/peers/threads/${encodeURIComponent(input.threadId)}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        body: input.body,
        displayName: input.displayName,
      }),
    },
  );
  const data = await parseJson<{ message: PeerMessage }>(response);
  return data.message;
}

export async function joinPeerThreadByInviteRemote(inviteCode: string): Promise<{
  threadId: string;
  displayName: string;
}> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ inviteCode }),
  });
  return parseJson(response);
}

export function buildPeerInviteUrl(inviteCode: string) {
  const origin = resolveAppOrigin();
  return `${origin}/peers/join?code=${encodeURIComponent(inviteCode)}`;
}

export async function saveMyPhoneProfile(input: {
  phone: string;
  displayName?: string;
}): Promise<{ phone: string }> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/profile/phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function fetchMyPhoneProfile(): Promise<{
  configured: boolean;
  phone: string | null;
  email?: string | null;
  rimvioId?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/profile/phone`, {
    credentials: "include",
  });
  return parseJson(response);
}

export async function saveMyRimvioId(rimvioId: string): Promise<{ rimvioId: string }> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/profile/rimvio-id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ rimvioId }),
  });
  return parseJson(response);
}

export type MyAccountProfile = {
  configured: boolean;
  phone: string | null;
  email: string | null;
  rimvioId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export async function fetchMyAccountProfile(): Promise<MyAccountProfile> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/profile`, {
    credentials: "include",
  });
  return parseJson(response);
}

export async function uploadMyProfileAvatar(file: Blob): Promise<{ avatarUrl: string }> {
  const form = new FormData();
  form.append("file", file, "avatar.jpg");
  const response = await fetch(`${resolveAppOrigin()}/api/peers/profile/avatar`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  return parseJson(response);
}

export async function removeMyProfileAvatar(): Promise<{ avatarUrl: null }> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/profile/avatar`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseJson(response);
}

export async function saveMyAccountProfile(input: {
  displayName?: string;
  phone?: string;
  rimvioId?: string;
  clearPhone?: boolean;
  clearAvatar?: boolean;
}): Promise<MyAccountProfile & { ok: boolean }> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function syncMyProfileFromAuth(): Promise<{
  email: string | null;
  phone: string | null;
  rimvioId?: string | null;
}> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/profile/sync`, {
    method: "POST",
    credentials: "include",
  });
  return parseJson(response);
}

export async function lookupFriendContactRemote(contact: string): Promise<{
  profile: {
    userId: string;
    displayName: string;
    rimvioId: string | null;
    avatarUrl: string | null;
    emailLower: string | null;
    matchedBy: string;
  };
  contact: string;
}> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/lookup-contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ contact: contact.trim() }),
  });
  return parseJson(response);
}

export async function addPeerByPhoneRemote(input: {
  phone?: string;
  contact?: string;
  displayName?: string;
  myPhone?: string;
}): Promise<{
  threadId: string;
  displayName: string;
  otherUserId?: string;
  rimvioId?: string | null;
  emailLower?: string | null;
  realtime: boolean;
}> {
  const contact = input.contact ?? input.phone ?? "";
  const response = await fetch(`${resolveAppOrigin()}/api/peers/add-by-phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ...input, contact }),
  });
  return parseJson(response);
}

export async function syncContactsFromDevice(
  contacts: Array<{ name: string; phone: string }>,
): Promise<{
  friends: Array<{
    threadId: string;
    displayName: string;
    phoneE164: string;
    rimvioId: string | null;
  }>;
  scanned: number;
  matched: number;
}> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/sync-contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ contacts }),
  });
  return parseJson(response);
}

export async function syncDmThreadsRemote(): Promise<
  Array<{ threadId: string; displayName: string }>
> {
  const response = await fetch(`${resolveAppOrigin()}/api/peers/threads`, {
    credentials: "include",
  });
  const data = await parseJson<{ threads: Array<{ threadId: string; displayName: string }> }>(
    response,
  );
  return data.threads;
}
