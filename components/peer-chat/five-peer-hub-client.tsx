"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FivePeerHub } from "@/components/peer-chat/five-peer-hub";
import { readPeerContacts } from "@/lib/context/peer-contact-store";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import { IOS } from "@/lib/ui/ios-surface";
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
import { FriendArchiveChatSheet } from "@/components/peer-chat/friend-archive-chat-sheet";
import {
  addPeerByPhoneRemote,
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
  listArchivePeers,
  peerMetaByThreadId,
} from "@/lib/social/sync-social-layer";
import {
  deriveArchiveBagState,
  totalArchiveUnread,
} from "@/lib/social/archive-bag-state";
import type { SocialBubblePeer } from "@/lib/social/bubble-state";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useRoomGuest } from "@/hooks/use-room-guest";
import { cn } from "@/lib/utils";

export function FivePeerHubClient() {
  const copy = useCopy();
  const guest = useRoomGuest();
  const router = useRouter();
  const { user, configured } = useAuth();
  const usePhoneChat = Boolean(configured && user && isSupabaseConfigured());
  const [roster, setRoster] = useState(() => readPinnedRoster());
  const [contacts, setContacts] = useState<PeerContact[]>(() => readPeerContacts());
  const [pinnedPeers, setPinnedPeers] = useState<SocialBubblePeer[]>([]);
  const [archivePeers, setArchivePeers] = useState<SocialBubblePeer[]>([]);
  const [feedSlots, setFeedSlots] = useState<RelationshipFeedSlot[]>([]);
  const [archiveSheetOpen, setArchiveSheetOpen] = useState(false);
  const [assignSlot, setAssignSlot] = useState<PinnedSlotIndex | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [myPhone, setMyPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [centerAvatarUrl, setCenterAvatarUrl] = useState<string | null>(null);

  const peerMetaMap = useMemo(
    () => peerMetaByThreadId(pinnedPeers),
    [pinnedPeers],
  );

  const [lensRevision, setLensRevision] = useState(0);

  const archiveList = useMemo(
    () => listArchivePeers(pinnedPeers, archivePeers),
    [pinnedPeers, archivePeers],
  );

  const archiveChatRows = useMemo(
    () => buildArchiveChatRows(archiveList, feedSlots),
    [archiveList, feedSlots],
  );

  const archiveBagProps = useMemo(
    () => ({
      count: archiveList.length,
      unreadTotal: totalArchiveUnread(archiveList),
      bubbleState: deriveArchiveBagState(archiveList),
      previewPeers: archiveChatRows,
    }),
    [archiveList, archiveChatRows],
  );

  const refresh = useCallback(() => {
    setRoster(syncPinnedRoster());
    setContacts(readPeerContacts());
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
        for (const thread of threads) {
          addPeerContact({
            peerThreadId: thread.threadId,
            displayName: thread.displayName,
          });
        }
        refresh();
      })
      .catch(() => {});
    void loadSocialLayer();
    const timer = window.setInterval(() => void loadSocialLayer(), 30_000);
    return () => window.clearInterval(timer);
  }, [usePhoneChat, refresh, loadSocialLayer]);

  useEffect(() => {
    if (!usePhoneChat || !archiveSheetOpen) {
      return;
    }
    void loadSocialLayer();
    const timer = window.setInterval(() => void loadSocialLayer(), 8_000);
    return () => window.clearInterval(timer);
  }, [usePhoneChat, archiveSheetOpen, loadSocialLayer]);

  const centerLabel = guest.label.startsWith("나")
    ? guest.label
    : `나 (${guest.label})`;
  const centerInitial = guest.label.trim().charAt(0) || "나";

  const openPinAssign = (slotIndex: PinnedSlotIndex) => {
    setAssignSlot(slotIndex);
    setName("");
    setPhone("");
  };

  const closeDialog = () => {
    setAssignSlot(null);
    setName("");
    setPhone("");
    setMyPhone("");
  };

  const addRegisteredFriend = async (
    contact: string,
    displayLabel?: string,
  ) => {
    setSubmitting(true);
    try {
      const result = await addPeerByPhoneRemote({
        contact,
        displayName: displayLabel || undefined,
        myPhone: myPhone.trim() || undefined,
      });
      addPeerContact({
        peerThreadId: result.threadId,
        displayName: result.displayName,
      });
      closeDialog();
      await loadSocialLayer();
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "친구 추가에 실패했어요";
      toast.error(message);
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const submit = () => {
    const trimmed = name.trim();
    const phoneTrimmed = phone.trim();

    if (usePhoneChat) {
      if (!phoneTrimmed) {
        toast.error("친구 Rimvio ID · 번호 · 이메일을 입력해 주세요");
        return;
      }
      void addRegisteredFriend(phoneTrimmed, trimmed || undefined).then(
        async (result) => {
          if (!result) {
            return;
          }
          const otherUserId =
            "otherUserId" in result
              ? (result as { otherUserId?: string }).otherUserId
              : undefined;

          if (assignSlot !== null && otherUserId) {
            try {
              await pinFriendRemote({
                friendId: otherUserId,
                pinSlot: assignSlot,
              });
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "고정에 실패했어요",
              );
              return;
            }
            assignPeerToHubAndPin({
              slotIndex: assignSlot,
              displayName: result.displayName,
              peerThreadId: result.threadId,
            });
            await loadSocialLayer();
            toast.success(
              `${result.displayName}를 항상 보이는 관계 ${assignSlot + 1}번에 고정했어요`,
            );
            router.push(`/peers/${encodeURIComponent(result.threadId)}`);
            return;
          }

          toast.success(`${result.displayName}를 구슬 주머니에 넣었어요`);
          router.push(`/peers/archive`);
        },
      );
      return;
    }

    toast.error("로그인 후 Rimvio 친구만 추가할 수 있어요");
  };

  const dialogOpen = assignSlot !== null;
  const dialogTitle = `${(assignSlot ?? 0) + 1}번 버블에 고정`;

  if (!usePhoneChat) {
    return <GuestPeersLanding configured={configured} />;
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <RimvioProductContextStrip
        variant="peers"
        className="mx-1"
        showFeedLink={false}
      />

      {connectedCount === 0 && !dialogOpen ? (
        <>
          <PeerHubEmptyState
            className="mx-1"
            onAddFriend={() => openPinAssign(0 as PinnedSlotIndex)}
          />
          <DemoPeerRoomPreview className="mx-1" />
        </>
      ) : (
        <p className="px-1 text-center text-[12px] text-white/55">
          {copy.peers.hubHint}
        </p>
      )}

      <div className="relative min-h-[min(72dvh,28rem)] h-[min(calc(100dvh-11rem),42rem)] w-full shrink-0">
        <FivePeerHub
          roster={roster}
          centerLabel={centerLabel}
          centerInitial={centerInitial}
          centerAvatarUrl={centerAvatarUrl}
          peerMetaByThread={peerMetaMap}
          lensEnabledByThreadId={lensEnabledByThreadId}
          onTogglePeerLens={handleTogglePeerLens}
          archiveBag={usePhoneChat ? archiveBagProps : undefined}
          onArchiveBagOpen={() => setArchiveSheetOpen(true)}
          onAssignSlot={(idx) => openPinAssign(idx as PinnedSlotIndex)}
          className="absolute inset-0"
        />
      </div>

      {dialogOpen ? (
        <div
          className={cn("mx-auto w-full max-w-sm space-y-3 p-4", IOS.cardSm)}
          role="dialog"
          aria-label={dialogTitle}
        >
          <p className="text-sm font-semibold text-white">{dialogTitle}</p>
          <p className="text-[11px] text-white/65">
            친한 5 · 메시지 영구 보관 · 나머지는 구슬 주머니
          </p>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="rimvio_id · 010-… · email@gmail.com"
            inputMode="text"
            className="h-11 w-full rounded-2xl border-0 bg-rimvio-surface-muted px-4 text-sm text-white outline-none placeholder:text-white/45 focus:ring-2 focus:ring-rimvio-neon-cyan/40"
            autoFocus
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 (선택)"
            className="h-11 w-full rounded-2xl border-0 bg-rimvio-surface-muted px-4 text-sm text-white outline-none placeholder:text-white/45"
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-[14px] py-2.5 text-sm font-semibold text-rimvio-neon-cyan"
              onClick={closeDialog}
              disabled={submitting}
            >
              취소
            </button>
            <button
              type="button"
              disabled={submitting}
              className="rimvio-accent-submit-btn flex flex-1 items-center justify-center rounded-[14px] py-2.5 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-50"
              onClick={submit}
            >
              {submitting ? "연결 중…" : "고정하기"}
            </button>
          </div>
        </div>
      ) : null}

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

      <p className="shrink-0 text-center text-[11px] text-white/60">
        친한 {connectedCount}/5
        {usePhoneChat ? ` · 주머니 ${archiveList.length}명` : ""}
      </p>

      <FriendArchiveChatSheet
        open={archiveSheetOpen}
        onOpenChange={setArchiveSheetOpen}
        rows={archiveChatRows}
      />
    </div>
  );
}
