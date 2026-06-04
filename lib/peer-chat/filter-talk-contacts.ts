import type { PeerContact } from "@/lib/context/peer-contact-types";
import { readPeerContacts } from "@/lib/context/peer-contact-store";

const MAX_RESULTS = 16;

/** @톡 친구 선택 — 로컬 연락처만 (이미 추가된 친구). */
export function filterPeerContactsForTalk(query: string): PeerContact[] {
  const contacts = readPeerContacts();
  const q = query.trim().toLowerCase();
  if (!q) {
    return contacts.slice(0, MAX_RESULTS);
  }
  return contacts
    .filter((c) => {
      const name = c.displayName.trim().toLowerCase();
      const id = c.peerThreadId.toLowerCase();
      return name.includes(q) || id.includes(q);
    })
    .slice(0, MAX_RESULTS);
}
