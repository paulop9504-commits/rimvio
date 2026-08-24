"use client";

import Link from "next/link";
import { Sparkles, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PeerAlignmentSlotGrid } from "@/components/peer-chat/peer-alignment-slot-grid";
import { PeerAiCoordinationList } from "@/components/peer-chat/peer-ai-coordination-list";
import { PeerHubEmptyState } from "@/components/peer-chat/peer-hub-empty-state";
import { PeerChatLanePills } from "@/components/peer-chat/peer-chat-lane-pills";
import { PeerFriendsTopBar } from "@/components/peer-chat/peer-friends-top-bar";
import { MyProfileSheet } from "@/components/peer-chat/my-profile-sheet";
import { PeerProfileAvatar } from "@/components/peer-chat/peer-profile-avatar";
import { MarketAlignmentRolePill } from "@/components/market/market-alignment-role-pill";
import type { GroupThreadListItem } from "@/components/peer-chat/group-thread-list";
import { useCopy } from "@/hooks/use-copy";
import type {
  AlignmentChatListItem,
} from "@/lib/peer-chat/alignment-chat-types";
import { buildAlignmentChatSlots } from "@/lib/peer-chat/alignment-chat-types";
import { formatPeerChatListPreview } from "@/lib/peer-chat/format-peer-chat-list-preview";
import { formatPeerChatListTime } from "@/lib/peer-chat/format-peer-chat-list-time";
import { prefetchPeerMessages } from "@/lib/peer-chat/message-prefetch-cache";
import {
  peerThreadMatchesLane,
  resolvePeerThreadLaneKind,
  type PeerChatLane,
} from "@/lib/peer-chat/peer-thread-lane";
import { PEERS_CHAT_LIST } from "@/lib/peer-chat/peers-chat-list-density";
import { dedupeAlignmentChatsByThread } from "@/lib/peer-chat/dedupe-alignment-chats";
import { useAgentNegotiationRooms } from "@/hooks/use-agent-negotiation-rooms";
import {
  extractOtherUserIdFromDmThread,
  isDmThreadId,
} from "@/lib/peer-chat/server-peer-chat";
import {
  hydratePeerAvatarInstantSrc,
  hydratePeerAvatarUrl,
  primePeerAvatarCache,
  writeCachedPeerAvatar,
} from "@/lib/peer-chat/peer-profile-avatar-cache";
import { useAuth } from "@/hooks/use-auth";
import type { PortalCategoryId } from "@/lib/portal/portal-types";
import type { ArchiveChatRow } from "@/lib/social/archive-chat-rows";
import { cn } from "@/lib/utils";

export type PeerFriendsRailProps = {
  rows: readonly ArchiveChatRow[];
  groups?: readonly GroupThreadListItem[];
  alignmentChats?: readonly AlignmentChatListItem[];
  initialLane?: PeerChatLane;
  onAddFriend: () => void;
  onCreateGroup?: () => void;
  className?: string;
};

function matchesSearch(
  query: string,
  parts: readonly (string | null | undefined)[],
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return parts.some((part) => part?.trim().toLowerCase().includes(q));
}

type DisplayRow = ArchiveChatRow & {
  laneKind: ReturnType<typeof resolvePeerThreadLaneKind>;
  alignmentMeta?: AlignmentChatListItem;
};

function resolveRowPeerUserId(
  row: Pick<ArchiveChatRow, "friendId" | "threadId">,
  selfUserId: string | null,
): string | null {
  const friendId = row.friendId.trim();
  if (friendId && !friendId.startsWith("peer-")) {
    return friendId;
  }
  if (selfUserId && isDmThreadId(row.threadId)) {
    return extractOtherUserIdFromDmThread(row.threadId, selfUserId);
  }
  return null;
}

function withCachedRowAvatar<T extends ArchiveChatRow>(
  row: T,
  selfUserId: string | null,
): T {
  const peerUserId = resolveRowPeerUserId(row, selfUserId);
  const avatarUrl = hydratePeerAvatarUrl(peerUserId, row.avatarUrl);
  if (avatarUrl && peerUserId) {
    writeCachedPeerAvatar(peerUserId, avatarUrl);
    void primePeerAvatarCache({ userId: peerUserId, avatarUrl });
  }
  if (!avatarUrl || avatarUrl === row.avatarUrl) {
    return row;
  }
  return { ...row, avatarUrl };
}

function readRowAvatarInstantSrc(
  row: Pick<ArchiveChatRow, "friendId" | "threadId" | "avatarUrl">,
  selfUserId: string | null,
): string | null {
  const peerUserId = resolveRowPeerUserId(row, selfUserId);
  return hydratePeerAvatarInstantSrc(peerUserId, row.avatarUrl);
}

export function PeerFriendsRail({
  rows,
  groups = [],
  alignmentChats = [],
  initialLane = "friend",
  onAddFriend,
  onCreateGroup,
  className,
}: PeerFriendsRailProps) {
  const copy = useCopy();
  const { user } = useAuth();
  const selfUserId = user?.id ?? null;
  const rail = copy.peers.friendRail;
  const alignmentCopy = rail.alignmentSlots;
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileKey, setProfileKey] = useState(0);
  const [lane, setLane] = useState<PeerChatLane>(initialLane);
  const { activeCount: aiCoordinationCount } = useAgentNegotiationRooms();
  const [selectedAlignmentCategory, setSelectedAlignmentCategory] =
    useState<PortalCategoryId | null>(null);

  useEffect(() => {
    setLane(initialLane);
  }, [initialLane]);

  useEffect(() => {
    if (lane !== "alignment") {
      setSelectedAlignmentCategory(null);
    }
  }, [lane]);

  const previewLabels = useMemo(
    () => ({
      photo: rail.previewPhoto,
      video: rail.previewVideo,
      startChat: rail.startChat,
      newMessages: rail.newMessages,
    }),
    [rail],
  );

  const dedupedAlignmentChats = useMemo(
    () => dedupeAlignmentChatsByThread(alignmentChats),
    [alignmentChats],
  );

  const alignmentByThread = useMemo(
    () => new Map(dedupedAlignmentChats.map((item) => [item.threadId, item])),
    [dedupedAlignmentChats],
  );

  const alignmentThreadIds = useMemo(
    () => new Set(dedupedAlignmentChats.map((item) => item.threadId)),
    [dedupedAlignmentChats],
  );

  const alignmentUserIds = useMemo(
    () => new Set(dedupedAlignmentChats.map((item) => item.otherUserId)),
    [dedupedAlignmentChats],
  );

  const unreadByThread = useMemo(
    () => new Map(rows.map((row) => [row.threadId, row.unreadCount])),
    [rows],
  );

  const alignmentSlots = useMemo(
    () => buildAlignmentChatSlots(dedupedAlignmentChats, unreadByThread),
    [dedupedAlignmentChats, unreadByThread],
  );

  const displayRows = useMemo((): DisplayRow[] => {
    const rowByThread = new Map(rows.map((row) => [row.threadId, row]));
    const merged: DisplayRow[] = [];

    for (const alignment of dedupedAlignmentChats) {
      const base =
        rowByThread.get(alignment.threadId) ??
        ({
          friendId: alignment.otherUserId,
          threadId: alignment.threadId,
          displayName: alignment.otherDisplayName,
          rimvioId: null,
          avatarUrl: alignment.otherAvatarUrl,
          bubbleState: "idle" as const,
          isPinned: false,
          pinSlot: null,
          unreadCount: 0,
          lastInteractionAt: alignment.updatedAtIso,
          messagesPurgeAfter: null,
          lastMessage: null,
          lastActivityAt: alignment.updatedAtIso,
        } satisfies ArchiveChatRow);

      merged.push({
        ...withCachedRowAvatar(base, selfUserId),
        displayName: alignment.otherDisplayName || base.displayName,
        avatarUrl:
          hydratePeerAvatarUrl(alignment.otherUserId, alignment.otherAvatarUrl) ??
          base.avatarUrl,
        lastActivityAt: base.lastActivityAt || alignment.updatedAtIso,
        laneKind: "alignment",
        alignmentMeta: alignment,
      });
    }

    for (const row of rows) {
      if (alignmentThreadIds.has(row.threadId)) {
        continue;
      }
      const peerUserId = resolveRowPeerUserId(row, selfUserId);
      if (peerUserId && alignmentUserIds.has(peerUserId)) {
        continue;
      }
      const laneKind = resolvePeerThreadLaneKind({
        threadId: row.threadId,
        alignmentThreadIds,
        hasContextLink: Boolean(row.contextEventId || row.contextSubtitle),
      });
      merged.push({ ...withCachedRowAvatar(row, selfUserId), laneKind });
    }

    return merged.sort((a, b) => {
      const aUnread = a.unreadCount > 0 ? 1 : 0;
      const bUnread = b.unreadCount > 0 ? 1 : 0;
      if (bUnread !== aUnread) {
        return bUnread - aUnread;
      }
      return (
        new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
      );
    });
  }, [dedupedAlignmentChats, rows, alignmentThreadIds, alignmentUserIds, selfUserId]);

  const laneCounts = useMemo(() => {
    const counts = {
      friend: 0,
      group: groups.length,
      context: 0,
      alignment: dedupedAlignmentChats.length,
      ai: aiCoordinationCount,
    };
    for (const row of displayRows) {
      if (row.laneKind === "friend") {
        counts.friend += 1;
      } else if (row.laneKind === "context") {
        counts.context += 1;
      }
    }
    return counts;
  }, [displayRows, groups.length, dedupedAlignmentChats.length, aiCoordinationCount]);

  const filteredGroups = useMemo(
    () =>
      groups.filter(
        (group) =>
          peerThreadMatchesLane(lane, "group") &&
          matchesSearch(searchQuery, [group.displayName]),
      ),
    [groups, lane, searchQuery],
  );

  const filteredRows = useMemo(() => {
    return displayRows.filter((row) => {
      if (lane === "friend" && row.laneKind === "alignment") {
        return false;
      }
      if (!peerThreadMatchesLane(lane, row.laneKind)) {
        return false;
      }
      if (
        lane === "alignment" &&
        selectedAlignmentCategory &&
        row.alignmentMeta?.portalCategoryId !== selectedAlignmentCategory
      ) {
        return false;
      }
      const alignmentTitle = row.alignmentMeta?.title;
      return matchesSearch(searchQuery, [
        row.displayName,
        row.rimvioId,
        row.contextSubtitle,
        row.lastMessage,
        alignmentTitle,
        row.alignmentMeta?.placeLabel,
      ]);
    });
  }, [displayRows, lane, searchQuery, selectedAlignmentCategory]);

  const showCreateGroup =
    onCreateGroup &&
    !searchQuery.trim() &&
    (lane === "all" || lane === "group");

  const showFriendEmpty =
    lane === "friend" && filteredRows.length === 0 && !searchQuery.trim();

  const showAlignmentEmpty =
    lane === "alignment" &&
    dedupedAlignmentChats.length === 0 &&
    !searchQuery.trim();

  const showAiLane = lane === "ai" && !searchQuery.trim();

  const showList =
    !showAiLane &&
    (filteredGroups.length > 0 ||
      filteredRows.length > 0 ||
      showCreateGroup);

  return (
    <section
      className={cn(PEERS_CHAT_LIST.shell, className)}
      data-peer-friends-rail
    >
      <PeerFriendsTopBar
        onOpenProfile={() => setProfileOpen(true)}
        onAddFriend={onAddFriend}
        searchOpen={searchOpen}
        onSearchToggle={() => {
          setSearchOpen((open) => {
            const next = !open;
            if (!next) {
              setSearchQuery("");
            }
            return next;
          });
        }}
        refreshKey={profileKey}
      />

      {!searchOpen ? (
        <PeerChatLanePills
          value={lane}
          onChange={setLane}
          counts={laneCounts}
        />
      ) : null}

      {searchOpen ? (
        <div className="shrink-0 border-b border-[#e5e8eb] bg-white px-4 py-2">
          <div className="relative">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={rail.searchPlaceholder}
              className={PEERS_CHAT_LIST.searchBar}
              autoFocus
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-[#8b95a1] active:bg-[#e5e8eb]"
                aria-label={rail.clearSearchAria}
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {lane === "alignment" && !searchQuery.trim() ? (
        <PeerAlignmentSlotGrid
          slots={alignmentSlots}
          selectedCategoryId={selectedAlignmentCategory}
          onSelectCategory={setSelectedAlignmentCategory}
        />
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-white pb-[var(--rimvio-bottom-nav-offset)] lg:pb-4">
        {showAiLane ? (
          <PeerAiCoordinationList />
        ) : showAlignmentEmpty ? (
          <div className="flex flex-col items-center gap-4 px-8 py-16 text-center">
            <span className="flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#e8f3ff] to-[#f4f9ff] text-3xl shadow-sm ring-1 ring-[#3182f6]/10">
              <Sparkles className="size-7 text-[#3182f6]" aria-hidden />
            </span>
            <div className="space-y-1.5">
              <p className="text-[16px] font-semibold text-[#191f28]">
                {alignmentCopy.emptyTitle}
              </p>
              <p className="text-[13px] leading-relaxed text-[#6b7684]">
                {alignmentCopy.emptyBody}
              </p>
            </div>
            <Link
              href="/"
              className="rimvio-accent-submit-btn rounded-full px-6 py-2.5 text-[13px] font-semibold text-white shadow-sm active:scale-[0.98]"
            >
              {alignmentCopy.emptyCta}
            </Link>
          </div>
        ) : showFriendEmpty ? (
          <PeerHubEmptyState onAddFriend={onAddFriend} />
        ) : !showList ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="text-sm text-[#6b7684]">
              {searchQuery.trim() ? rail.searchEmpty : rail.empty}
            </p>
          </div>
        ) : (
          <ul>
            {showCreateGroup ? (
              <li className="border-b border-[#f2f4f6]">
                <button
                  type="button"
                  onClick={onCreateGroup}
                  className={cn(PEERS_CHAT_LIST.row, "w-full text-left")}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8f3ff] text-[#3182f6]">
                    <Users className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={PEERS_CHAT_LIST.name}>{rail.createGroupFirst}</p>
                    <p className={PEERS_CHAT_LIST.preview}>{rail.createGroupHint}</p>
                  </div>
                </button>
              </li>
            ) : null}

            {filteredGroups.map((group) => {
              const href = `/peers/${encodeURIComponent(group.threadId)}`;
              return (
                <li key={group.threadId} className="border-b border-[#f2f4f6]">
                  <Link
                    href={href}
                    onMouseEnter={() => prefetchPeerMessages(group.threadId)}
                    onTouchStart={() => prefetchPeerMessages(group.threadId)}
                    className={cn(PEERS_CHAT_LIST.row, "relative z-[1]")}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f2f4f6] text-[#4e5968]">
                      <Users className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={PEERS_CHAT_LIST.name}>{group.displayName}</p>
                      <p className={PEERS_CHAT_LIST.preview}>{rail.groupPreview}</p>
                    </div>
                  </Link>
                </li>
              );
            })}

            {filteredRows.map((row) => {
              const href = `/peers/${encodeURIComponent(row.threadId)}`;
              const alignment = row.alignmentMeta;
              const alignmentSubtitle = alignment
                ? alignmentCopy.subtitle(alignment.title)
                : null;
              const contextLine = alignmentSubtitle ?? row.contextSubtitle?.trim();
              const waitingBuyer =
                alignment?.phase === "pending_buyer_start"
                  ? alignmentCopy.waitingBuyer
                  : null;
              const preview = waitingBuyer
                ? waitingBuyer
                : contextLine
                  ? contextLine
                  : formatPeerChatListPreview(
                      row.lastMessage,
                      row.unreadCount,
                      previewLabels,
                    );
              const isUnread = row.unreadCount > 0;
              const previewClass = waitingBuyer
                ? isUnread
                  ? PEERS_CHAT_LIST.previewUnread
                  : PEERS_CHAT_LIST.preview
                : contextLine
                  ? isUnread
                    ? PEERS_CHAT_LIST.contextPreviewUnread
                    : PEERS_CHAT_LIST.contextPreview
                  : isUnread
                    ? PEERS_CHAT_LIST.previewUnread
                    : PEERS_CHAT_LIST.preview;

              return (
                <li
                  key={row.threadId}
                  className={cn(
                    PEERS_CHAT_LIST.rowSlot,
                    !isUnread && "border-b border-[#f2f4f6]",
                  )}
                >
                  <Link
                    href={href}
                    onMouseEnter={() => prefetchPeerMessages(row.threadId)}
                    onTouchStart={() => prefetchPeerMessages(row.threadId)}
                    className={cn(
                      PEERS_CHAT_LIST.row,
                      isUnread && PEERS_CHAT_LIST.rowUnread,
                      "relative z-[1]",
                    )}
                  >
                    <PeerProfileAvatar
                      displayName={row.displayName}
                      avatarUrl={row.avatarUrl}
                      instantSrc={readRowAvatarInstantSrc(row, selfUserId)}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                          <p
                            className={cn(
                              "min-w-0 truncate",
                              PEERS_CHAT_LIST.name,
                              isUnread && PEERS_CHAT_LIST.nameUnread,
                            )}
                          >
                            {row.displayName}
                          </p>
                          {alignment?.otherRole ? (
                            <MarketAlignmentRolePill
                              role={alignment.otherRole}
                              size="xs"
                            />
                          ) : null}
                        </div>
                        <span
                          className={cn(
                            PEERS_CHAT_LIST.time,
                            isUnread && PEERS_CHAT_LIST.timeUnread,
                          )}
                        >
                          {formatPeerChatListTime(row.lastActivityAt)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className={cn("min-w-0 flex-1", previewClass)}>
                          {preview}
                        </p>
                        {isUnread ? (
                          row.unreadCount > 1 ? (
                            <span className={PEERS_CHAT_LIST.unreadBadge}>
                              {row.unreadCount > 99 ? "99+" : row.unreadCount}
                            </span>
                          ) : (
                            <span
                              className={PEERS_CHAT_LIST.unreadDot}
                              aria-label={rail.newMessages(1)}
                            />
                          )
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <MyProfileSheet
        key={profileKey}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        onSaved={() => setProfileKey((k) => k + 1)}
      />
    </section>
  );
}
