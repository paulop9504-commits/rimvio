import type { MarketHandshakePhase } from "@/lib/globe/market/market-handshake-types";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import type { PortalCategoryId } from "@/lib/portal/portal-types";

export type AlignmentChatListItem = {
  handshakeId: string;
  threadId: string;
  phase: MarketHandshakePhase;
  portalCategoryId: PortalCategoryId;
  title: string;
  placeLabel: string;
  otherUserId: string;
  otherDisplayName: string;
  otherAvatarUrl: string | null;
  /** 상대 역할 — 구매(seeking) / 내놓기(listing) */
  otherRole: MarketIntentRole;
  updatedAtIso: string;
};

export type AlignmentChatSlot = {
  portalCategoryId: PortalCategoryId;
  count: number;
  unreadCount: number;
  latestAtIso: string;
};

export function buildAlignmentChatSlots(
  items: readonly AlignmentChatListItem[],
  unreadByThread: ReadonlyMap<string, number>,
): AlignmentChatSlot[] {
  const byCategory = new Map<PortalCategoryId, AlignmentChatSlot>();

  for (const item of items) {
    const unread = unreadByThread.get(item.threadId) ?? 0;
    const existing = byCategory.get(item.portalCategoryId);
    if (!existing) {
      byCategory.set(item.portalCategoryId, {
        portalCategoryId: item.portalCategoryId,
        count: 1,
        unreadCount: unread,
        latestAtIso: item.updatedAtIso,
      });
      continue;
    }
    existing.count += 1;
    existing.unreadCount += unread;
    if (new Date(item.updatedAtIso).getTime() > new Date(existing.latestAtIso).getTime()) {
      existing.latestAtIso = item.updatedAtIso;
    }
  }

  return [...byCategory.values()].sort(
    (a, b) => new Date(b.latestAtIso).getTime() - new Date(a.latestAtIso).getTime(),
  );
}
