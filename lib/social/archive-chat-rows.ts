import type { EventCandidate } from "@/lib/events/event-candidate";
import { buildPeerThreadContextIndex } from "@/lib/peer-chat/resolve-peer-thread-context-label";
import type { SocialBubblePeer } from "@/lib/social/bubble-state";
import type { RelationshipFeedSlot } from "@/lib/social/relationship-slot-types";

export type ArchiveChatRow = SocialBubblePeer & {
  lastMessage: string | null;
  lastActivityAt: string;
  /** Linked experience title — line 2 when present. */
  contextSubtitle?: string | null;
  contextEventId?: string | null;
};

/** Unread first, then recency — Kakao-style chat list order. */
export function sortArchivePeersForChat<T extends Pick<
  SocialBubblePeer,
  "unreadCount" | "lastInteractionAt"
> & { lastActivityAt?: string }>(
  peers: readonly T[],
): T[] {
  return [...peers].sort((a, b) => {
    const aUnread = a.unreadCount > 0 ? 1 : 0;
    const bUnread = b.unreadCount > 0 ? 1 : 0;
    if (bUnread !== aUnread) {
      return bUnread - aUnread;
    }
    if (b.unreadCount !== a.unreadCount) {
      return b.unreadCount - a.unreadCount;
    }
    const aAt = new Date(a.lastActivityAt ?? a.lastInteractionAt).getTime();
    const bAt = new Date(b.lastActivityAt ?? b.lastInteractionAt).getTime();
    return bAt - aAt;
  });
}

export function buildArchiveChatRows(
  peers: readonly SocialBubblePeer[],
  slots: readonly RelationshipFeedSlot[],
): ArchiveChatRow[] {
  const slotByRoom = new Map(slots.map((slot) => [slot.roomId, slot]));
  const rows: ArchiveChatRow[] = peers.map((peer) => {
    const slot = slotByRoom.get(peer.threadId);
    return {
      ...peer,
      unreadCount: Math.max(peer.unreadCount, slot?.unreadCount ?? 0),
      lastMessage: slot?.lastMessage ?? null,
      lastActivityAt: slot?.lastActivityAt ?? peer.lastInteractionAt,
    };
  });
  return sortArchivePeersForChat(rows);
}

export function enrichArchiveChatRowsWithContext(
  rows: readonly ArchiveChatRow[],
  events: readonly EventCandidate[],
): ArchiveChatRow[] {
  const index = buildPeerThreadContextIndex(events);
  return rows.map((row) => {
    const ctx = index.get(row.threadId);
    if (!ctx) {
      return row;
    }
    return {
      ...row,
      contextSubtitle: ctx.title,
      contextEventId: ctx.eventId,
    };
  });
}
