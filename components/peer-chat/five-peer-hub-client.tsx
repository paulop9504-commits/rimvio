"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { readPinnedRoster, syncPinnedRoster } from "@/lib/context/peer-thread-settings-store";
import { GuestPeersLanding } from "@/components/peer-chat/guest-peers-landing";
import { useCopy } from "@/hooks/use-copy";
import { FriendAddSheet } from "@/components/peer-chat/friend-add-sheet";
import { PeerFriendsRail } from "@/components/peer-chat/peer-friends-rail";
import type { FriendAddResult } from "@/components/peer-chat/friend-add-contact-flow";
import { GroupCreateSheet } from "@/components/peer-chat/group-create-sheet";
import type { GroupThreadListItem } from "@/components/peer-chat/group-thread-list";
import {
  fetchAlignmentChatsRemote,
} from "@/lib/peer-chat/fetch-alignment-chats-client";
import type { AlignmentChatListItem } from "@/lib/peer-chat/alignment-chat-types";
import { usePeerInboxSync } from "@/hooks/use-peer-inbox-sync";
import {
  fetchRelationshipFeedSlots,
  fetchSocialLayer,
  syncDmThreadsRemote,
  syncMyProfileFromAuth,
} from "@/lib/peer-chat/peer-chat-client";
import { PEER_FEED_SLOTS_CACHE_KEY } from "@/lib/experience-bridge/bridge-api-cache";
import { invalidateCachedFetch } from "@/lib/http/client-fetch-cache";
import type { RelationshipFeedSlot } from "@/lib/social/relationship-slot-types";
import {
  addPeerContact,
  readPeerContacts,
} from "@/lib/context/peer-contact-store";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import { dedupeAlignmentChatsByThread } from "@/lib/peer-chat/dedupe-alignment-chats";
import {
  primePeerAvatarCache,
  writeCachedPeerAvatar,
} from "@/lib/peer-chat/peer-profile-avatar-cache";
import { buildPeersHomeRows } from "@/lib/social/build-peers-home-rows";
import { enrichArchiveChatRowsWithContext } from "@/lib/social/archive-chat-rows";
import type { SocialBubblePeer } from "@/lib/social/bubble-state";
import {
  listLifeEventCandidates,
  subscribeLifeCandidatesUpdated,
} from "@/lib/life-read-model";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function FivePeerHubClient() {
  const copy = useCopy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, configured } = useAuth();
  const usePhoneChat = Boolean(configured && user && isSupabaseConfigured());

  useEffect(() => {
    const auth = searchParams.get("auth");
    if (!auth) {
      return;
    }

    if (auth === "error") {
      toast.error(copy.auth.loginFail, {
        description: copy.auth.loginFailHint,
      });
    } else if (auth === "invalid_key") {
      toast.error(copy.auth.loginFail, {
        description: copy.auth.invalidSupabaseKeyHint,
      });
    } else if (auth === "missing_code") {
      toast.error(copy.auth.loginIncomplete);
    }

    router.replace("/peers", { scroll: false });
  }, [searchParams, copy.auth, router]);

  const [roster, setRoster] = useState(() => readPinnedRoster());
  const [contacts, setContacts] = useState<PeerContact[]>(() => readPeerContacts());
  const [pinnedPeers, setPinnedPeers] = useState<SocialBubblePeer[]>([]);
  const [archivePeers, setArchivePeers] = useState<SocialBubblePeer[]>([]);
  const [feedSlots, setFeedSlots] = useState<RelationshipFeedSlot[]>([]);
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);
  const [groupThreads, setGroupThreads] = useState<GroupThreadListItem[]>([]);
  const [alignmentChats, setAlignmentChats] = useState<AlignmentChatListItem[]>([]);
  const [friendAddOpen, setFriendAddOpen] = useState(false);
  const [lifeTick, setLifeTick] = useState(0);

  useEffect(() => subscribeLifeCandidatesUpdated(() => setLifeTick((t) => t + 1)), []);

  const friendRailRows = useMemo(
    () => {
      const rows = buildPeersHomeRows({
        pinned: pinnedPeers,
        archive: archivePeers,
        contacts,
        roster,
        feedSlots,
      });
      return enrichArchiveChatRowsWithContext(rows, listLifeEventCandidates());
    },
    [pinnedPeers, archivePeers, contacts, roster, feedSlots, lifeTick],
  );

  const refresh = useCallback(() => {
    setRoster(syncPinnedRoster());
    setContacts(readPeerContacts());
  }, []);

  const loadSocialLayer = useCallback(async () => {
    if (!usePhoneChat) {
      return;
    }
    try {
      invalidateCachedFetch(PEER_FEED_SLOTS_CACHE_KEY);
      const [layer, feed, alignment] = await Promise.all([
        fetchSocialLayer(),
        fetchRelationshipFeedSlots().catch(() => ({ slots: [] as RelationshipFeedSlot[] })),
        fetchAlignmentChatsRemote().catch(() => ({ items: [] as AlignmentChatListItem[] })),
      ]);
      setPinnedPeers(layer.pinned);
      setArchivePeers(layer.archive);
      setFeedSlots(feed.slots);
      setAlignmentChats(dedupeAlignmentChatsByThread(alignment.items));
      for (const peer of [...layer.pinned, ...layer.archive]) {
        if (peer.avatarUrl?.trim()) {
          writeCachedPeerAvatar(peer.friendId, peer.avatarUrl);
          void primePeerAvatarCache({
            userId: peer.friendId,
            avatarUrl: peer.avatarUrl,
          });
        }
      }
      for (const item of alignment.items) {
        if (item.otherAvatarUrl?.trim()) {
          writeCachedPeerAvatar(item.otherUserId, item.otherAvatarUrl);
          void primePeerAvatarCache({
            userId: item.otherUserId,
            avatarUrl: item.otherAvatarUrl,
          });
        }
      }
      applySocialLayerToLocalRoster(layer);
      refresh();
    } catch {
      refresh();
    }
  }, [usePhoneChat, refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!usePhoneChat) {
      return;
    }
    void syncMyProfileFromAuth().catch(() => {});
    void syncDmThreadsRemote()
      .then((threads) => {
        const groups: GroupThreadListItem[] = [];
        for (const thread of threads) {
          if (thread.roomKind === "group") {
            groups.push({
              threadId: thread.threadId,
              displayName: thread.displayName,
            });
            continue;
          }
          addPeerContact({
            peerThreadId: thread.threadId,
            displayName: thread.displayName,
          });
        }
        setGroupThreads(groups);
        refresh();
      })
      .catch(() => {});
    void loadSocialLayer();
  }, [usePhoneChat, refresh, loadSocialLayer]);

  usePeerInboxSync({
    enabled: usePhoneChat,
    onRefresh: loadSocialLayer,
  });

  const handleFriendAdded = async (result: FriendAddResult) => {
    addPeerContact({
      peerThreadId: result.threadId,
      displayName: result.displayName,
      rimvioId: result.rimvioId,
      emailLower: result.emailLower,
    });
    toast.success(`${result.displayName}를 친구 목록에 추가했어요`);
    setFriendAddOpen(false);
    await loadSocialLayer();
    router.push(`/peers/${encodeURIComponent(result.threadId)}`);
  };

  if (!usePhoneChat) {
    return <GuestPeersLanding configured={configured} />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PeerFriendsRail
        rows={friendRailRows}
        groups={groupThreads}
        alignmentChats={alignmentChats}
        onAddFriend={() => setFriendAddOpen(true)}
        onCreateGroup={() => setGroupSheetOpen(true)}
        className="min-h-0 flex-1"
      />

      <FriendAddSheet
        open={friendAddOpen}
        onOpenChange={setFriendAddOpen}
        onAdded={handleFriendAdded}
        onContactSynced={() => void loadSocialLayer()}
      />

      <GroupCreateSheet
        open={groupSheetOpen}
        onOpenChange={setGroupSheetOpen}
        onCreated={({ threadId, displayName }) => {
          setGroupThreads((prev) => [
            { threadId, displayName },
            ...prev.filter((row) => row.threadId !== threadId),
          ]);
          toast.success(`${displayName} 단톡을 만들었어요`);
          router.push(`/peers/${encodeURIComponent(threadId)}`);
        }}
      />
    </div>
  );
}
