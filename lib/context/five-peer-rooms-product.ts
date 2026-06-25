/**
 * Product shape: unlimited 1:1 contacts + 5 AI pin slots.
 * @see docs/PEER_SOCIAL_POLICY.md
 */

import { getPeerContactById } from "@/lib/context/peer-contact-store";
import type { PeerThreadPolicyInput } from "@/lib/context/peer-thread-types";
import { isGroupThreadId } from "@/lib/peer-chat/group-thread";
import { isRegisteredPeerDmThread } from "@/lib/peer-chat/peer-chat-client";

export const FIVE_PEER_ROOMS_PRODUCT = true;

/** Friend exists in contact book (unlimited) or cloud DM/group thread. */
export function isKnownPeerContact(input: PeerThreadPolicyInput): boolean {
  const threadId = input.settings.peerThreadId;
  if (isRegisteredPeerDmThread(threadId) || isGroupThreadId(threadId)) {
    return true;
  }
  return Boolean(getPeerContactById(threadId));
}

/** AI pin slots removed — all known contacts use basic chat storage. */
export function isActivePeerRoom(_input: PeerThreadPolicyInput): boolean {
  return false;
}

/** Pin hub UI removed — peers home is chat list only. */
export function isHubRoomSurface(): boolean {
  return false;
}
