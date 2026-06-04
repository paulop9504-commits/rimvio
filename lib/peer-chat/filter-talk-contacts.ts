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
  const filtered = contacts.filter((c) => {
    const name = c.displayName.trim().toLowerCase();
    const id = c.peerThreadId.toLowerCase();
    return name.includes(q) || id.includes(q);
  });

  filtered.sort((a, b) => {
    const an = a.displayName.trim().toLowerCase();
    const bn = b.displayName.trim().toLowerCase();
    const aStarts = an.startsWith(q) ? 0 : 1;
    const bStarts = bn.startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) {
      return aStarts - bStarts;
    }
    return an.localeCompare(bn, "ko");
  });

  return filtered.slice(0, MAX_RESULTS);
}
