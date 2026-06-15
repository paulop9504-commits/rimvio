"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FivePeerHub } from "@/components/peer-chat/five-peer-hub";
import { countConnectedPeers } from "@/lib/context/pinned-peer-roster";
import {
  assignPeerToHubAndPin,
  readPeerThreadSettings,
  readPinnedRoster,
  setPeerThreadAiLens,
  syncPinnedRoster,
} from "@/lib/context/peer-thread-settings-store";
import type { PinnedSlotIndex } from "@/lib/context/peer-thread-types";
import { PeerProfileSetup } from "@/components/peer-chat/peer-profile-setup";
import { RimvioProductContextStrip } from "@/components/rimvio-product-context-strip";
import { PeerHubEmptyState } from "@/components/peer-chat/peer-hub-empty-state";
import { DemoPeerRoomPreview } from "@/components/peer-chat/demo-peer-room-preview";
import { GuestPeersLanding } from "@/components/peer-chat/guest-peers-landing";
import { useCopy } from "@/hooks/use-copy";
import {
  markLensFirstCoachShown,
  shouldShowLensFirstCoach,
} from "@/lib/onboarding/lens-first-coach";
import { FriendAddSheet } from "@/components/peer-chat/friend-add-sheet";
import { PeerFriendsRail } from "@/components/peer-chat/peer-friends-rail";
import type { FriendAddResult } from "@/components/peer-chat/friend-add-contact-flow";
import { GroupCreateSheet } from "@/components/peer-chat/group-create-sheet";
import {
  GroupThreadList,
  type GroupThreadListItem,
} from "@/components/peer-chat/group-thread-list";
import {
  fetchMyAccountProfile,
  fetchRelationshipFeedSlots,
  fetchSocialLayer,
  pinFriendRemote,
  syncDmThreadsRemote,
  syncMyProfileFromAuth,
} from "@/lib/peer-chat/peer-chat-client";
import { buildArchiveChatRows } from "@/lib/social/archive-chat-rows";
import type { RelationshipFeedSlot } from "@/lib/social/relationship-slot-types";
import { addPeerContact } from "@/lib/context/peer-contact-store";
import {
  applySocialLayerToLocalRoster,
  peerMetaByThreadId,
} from "@/lib/social/sync-social-layer";
import type { SocialBubblePeer } from "@/lib/social/bubble-state";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useRoomGuest } from "@/hooks/use-room-guest";

export function FivePeerHubClient() {
  const copy = useCopy();
  const guest = useRoomGuest();
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
  const [pinnedPeers, setPinnedPeers] = useState<SocialBubblePeer[]>([]);
  const [archivePeers, setArchivePeers] = useState<SocialBubblePeer[]>([]);
  const [feedSlots, setFeedSlots] = useState<RelationshipFeedSlot[]>([]);
  const [pinnedHubExpanded, setPinnedHubExpanded] = useState(false);
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);
  const [groupThreads, setGroupThreads] = useState<GroupThreadListItem[]>([]);
  const [assignSlot, setAssignSlot] = useState<PinnedSlotIndex | null>(null);
  const [friendAddOpen, setFriendAddOpen] = useState(false);
  const [centerAvatarUrl, setCenterAvatarUrl] = useState<string | null>(null);

  const peerMetaMap = useMemo(
    () => peerMetaByThreadId([...pinnedPeers, ...archivePeers]),
    [pinnedPeers, archivePeers],
  );

  const [lensRevision, setLensRevision] = useState(0);

  const allFriendPeers = useMemo(() => {
    const byThread = new Map<string, SocialBubblePeer>();
    for (const peer of [...pinnedPeers, ...archivePeers]) {
      byThread.set(peer.threadId, peer);
    }
    return [...byThread.values()];
  }, [pinnedPeers, archivePeers]);

  const friendRailRows = useMemo(
    () => buildArchiveChatRows(allFriendPeers, feedSlots),
    [allFriendPeers, feedSlots],
  );

  const refresh = useCallback(() => {
    setRoster(syncPinnedRoster());
  }, []);

  const lensEnabledByThreadId = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const slot of roster.slots) {
      if (slot.peerThreadId && slot.connection === "connected") {
        const threadSettings = readPeerThreadSettings(slot.peerThreadId);
        map.set(slot.peerThreadId, Boolean(threadSettings?.aiLensEnabled));
      }
    }
    return map;
  }, [roster, lensRevision]);

  const handleTogglePeerLens = useCallback(
    (peerThreadId: string) => {
      const slot = roster.slots.find((s) => s.peerThreadId === peerThreadId);
      const meta = peerMetaMap.get(peerThreadId);
      const displayName =
        meta?.displayName?.trim() ||
        slot?.displayName?.trim() ||
        meta?.rimvioId ||
        "친구";
      const current = readPeerThreadSettings(peerThreadId)?.aiLensEnabled ?? false;
      const next = !current;
      setPeerThreadAiLens({
        peerThreadId,
        displayName,
        enabled: next,
      });
      setLensRevision((n) => n + 1);
      refresh();
      if (next && shouldShowLensFirstCoach()) {
        markLensFirstCoachShown();
        toast.success(copy.product.lensCoachOn, {
          description: copy.product.lensCoachSub,
          duration: 5500,
        });
      } else {
        toast.success(
          next
            ? `${displayName} · AI 렌즈 켜짐`
            : `${displayName} · AI 렌즈 꺼짐`,
        );
      }
    },
    [roster, peerMetaMap, refresh, copy.product.lensCoachOn, copy.product.lensCoachSub],
  );

  const connectedCount = countConnectedPeers(roster);

  const loadSocialLayer = useCallback(async () => {
    if (!usePhoneChat) {
      return;
    }
    try {
      const [layer, feed] = await Promise.all([
        fetchSocialLayer(),
        fetchRelationshipFeedSlots().catch(() => ({ slots: [] as RelationshipFeedSlot[] })),
      ]);
      setPinnedPeers(layer.pinned);
      setArchivePeers(layer.archive);
      setFeedSlots(feed.slots);
      applySocialLayerToLocalRoster(layer);
      refresh();
    } catch {
      // local roster fallback
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
    void fetchMyAccountProfile()
      .then((p) => setCenterAvatarUrl(p.avatarUrl ?? null))
      .catch(() => {});
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
    const timer = window.setInterval(() => void loadSocialLayer(), 30_000);
    return () => window.clearInterval(timer);
  }, [usePhoneChat, refresh, loadSocialLayer]);

  const centerLabel = guest.label.startsWith("나")
    ? guest.label
    : `나 (${guest.label})`;
  const centerInitial = guest.label.trim().charAt(0) || "나";

  const openPinAssign = (slotIndex: PinnedSlotIndex) => {
    setFriendAddOpen(true);
    setAssignSlot(slotIndex);
  };

  const openQuickFriendAdd = () => {
    setAssignSlot(null);
    setFriendAddOpen(true);
  };

  const closeFriendAdd = () => {
    setAssignSlot(null);
    setFriendAddOpen(false);
  };

  const handleFriendAdded = async (result: FriendAddResult) => {
    addPeerContact({
      peerThreadId: result.threadId,
      displayName: result.displayName,
      rimvioId: result.rimvioId,
      emailLower: result.emailLower,
    });

    const slot = assignSlot;
    const otherUserId = result.otherUserId;

    if (slot !== null && otherUserId) {
      try {
        await pinFriendRemote({
          friendId: otherUserId,
          pinSlot: slot,
        });
        assignPeerToHubAndPin({
          slotIndex: slot,
          displayName: result.displayName,
          peerThreadId: result.threadId,
        });
        toast.success(
          `${result.displayName}를 항상 보이는 관계 ${slot + 1}번에 고정했어요`,
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "고정에 실패했어요",
        );
        toast.message("친구는 추가됐어요. 대화방으로 이동할게요");
      }
    } else {
      toast.success(`${result.displayName}를 친구 목록에 추가했어요`);
    }

    closeFriendAdd();
    await loadSocialLayer();
    router.push(`/peers/${encodeURIComponent(result.threadId)}`);
  };

  if (!usePhoneChat) {
    return <GuestPeersLanding configured={configured} />;
  }

  return (
    <div className="flex min-h-0 flex-col gap-4 pb-6">
      <RimvioProductContextStrip
        variant="peers"
        className="mx-1 shrink-0"
        showFeedLink={false}
      />

      {connectedCount === 0 && friendRailRows.length === 0 && !friendAddOpen ? (
        <>
          <PeerHubEmptyState
            className="mx-1 shrink-0"
            onAddFriend={openQuickFriendAdd}
          />
          <DemoPeerRoomPreview className="mx-1 shrink-0" />
        </>
      ) : (
        <PeerFriendsRail
          rows={friendRailRows}
          onAddFriend={openQuickFriendAdd}
          className="mx-1 min-h-[min(42dvh,20rem)] max-h-[min(52dvh,28rem)] shrink-0"
        />
      )}

      <GroupThreadList
        groups={groupThreads}
        onCreate={() => setGroupSheetOpen(true)}
        className="mx-1 shrink-0"
      />

      {connectedCount > 0 || friendRailRows.some((row) => row.isPinned) ? (
        <section className="mx-1 shrink-0">
          <button
            type="button"
            onClick={() => setPinnedHubExpanded((value) => !value)}
            className="flex w-full items-center gap-2 rounded-2xl border border-[#0220470f] bg-rimvio-base px-4 py-3 text-left shadow-sm active:bg-[#f2f4f6]"
            aria-expanded={pinnedHubExpanded}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-[#191f28]">
                {copy.peers.friendRail.pinnedSection}
              </p>
              <p className="text-[11px] text-[#6b7684]">
                {copy.peers.friendRail.pinnedSectionHint} · {connectedCount}/5
              </p>
            </div>
            {pinnedHubExpanded ? (
              <ChevronUp className="size-4 shrink-0 text-[#8b95a1]" aria-hidden />
            ) : (
              <ChevronDown className="size-4 shrink-0 text-[#8b95a1]" aria-hidden />
            )}
          </button>

          {pinnedHubExpanded ? (
            <div className="relative mt-2 h-[min(36dvh,16rem)] w-full">
              <FivePeerHub
                roster={roster}
                centerLabel={centerLabel}
                centerInitial={centerInitial}
                centerAvatarUrl={centerAvatarUrl}
                peerMetaByThread={peerMetaMap}
                lensEnabledByThreadId={lensEnabledByThreadId}
                onTogglePeerLens={handleTogglePeerLens}
                onAssignSlot={(idx) => openPinAssign(idx as PinnedSlotIndex)}
                className="absolute inset-0"
              />
            </div>
          ) : null}
        </section>
      ) : null}

      <FriendAddSheet
        open={friendAddOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeFriendAdd();
          } else {
            setFriendAddOpen(true);
          }
        }}
        pinSlot={assignSlot}
        onAdded={handleFriendAdded}
        onContactSynced={() => void loadSocialLayer()}
      />

      {usePhoneChat ? (
        <PeerProfileSetup
          className="mx-1"
          onRegistered={() => {
            refresh();
            void fetchMyAccountProfile()
              .then((p) => setCenterAvatarUrl(p.avatarUrl ?? null))
              .catch(() => {});
          }}
        />
      ) : null}

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
