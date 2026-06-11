"use client";

import { fetchPeerThreadMembers } from "@/lib/peer-chat/peer-chat-client";

/** 1:1 thread — the other member's user id. */
export async function resolvePeerPartnerUserId(
  peerThreadId: string,
): Promise<string | null> {
  const threadId = peerThreadId.trim();
  if (!threadId) {
    return null;
  }
  try {
    const members = await fetchPeerThreadMembers(threadId);
    const partner = members.find((row) => !row.isSelf);
    return partner?.userId?.trim() ?? null;
  } catch {
    return null;
  }
}
