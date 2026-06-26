"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ExperienceDiscussionHeader } from "@/components/experience/experience-discussion-header";
import { buildExperienceRoomBackHref } from "@/lib/globe/resolve-experience-peer-thread-id";
import { toast } from "sonner";
import { useLongPress } from "@/lib/hooks/use-long-press";
import { useCopy } from "@/hooks/use-copy";
import { usePeerThreadSettings } from "@/hooks/use-peer-thread-settings";
import {
  markLensFirstCoachShown,
  shouldShowLensFirstCoach,
} from "@/lib/onboarding/lens-first-coach";
import { PeerPublicProfileSheet } from "@/components/peer-chat/peer-public-profile-sheet";
import { useDmPeerProfile } from "@/hooks/use-dm-peer-profile";
import {
  fetchPeerThreadMeta,
  isRegisteredPeerDmThread,
  markPeerThreadReadRemote,
  syncFeedSlotFromRoomRemote,
} from "@/lib/peer-chat/peer-chat-client";
import { isGroupThreadId } from "@/lib/peer-chat/group-thread";
import { emitFeedSlotsRefresh } from "@/lib/feed/feed-slots-events";
import {
  addPeerContact,
  getPeerContactById,
} from "@/lib/context/peer-contact-store";
import type { PeerContact } from "@/lib/context/peer-contact-types";
import { findSlotByPeerId } from "@/lib/context/pinned-peer-roster";
import { readPinnedRoster } from "@/lib/context/peer-thread-settings-store";
import { isBridgeContextThreadId } from "@/lib/peer-chat/bridge-context-thread";
import { cn } from "@/lib/utils";
import { AiLensToggle } from "@/components/peer-chat/ai-lens-toggle";
import { PeerChatThreadShell } from "@/components/peer-chat/peer-chat-thread-shell";
import { PeerThreadChatPanel } from "@/components/peer-chat/peer-thread-chat-panel";
import { GroupInfoSheet } from "@/components/peer-chat/group-info-sheet";
import {
  fetchMarketHandshakeRoomRemote,
  startMarketHandshakeChatRemote,
  type MarketHandshakeRoomState,
} from "@/lib/globe/market/client/sync-market-intent-remote";
import { listMarketChatQuickReplies } from "@/lib/globe/market/market-chat-quick-replies";
import {
  MarketHandshakeLockedHint,
  MarketHandshakeProductStrip,
  MarketHandshakeStartBar,
} from "@/components/market/market-handshake-room-gate";
import { MarketAlignmentRolePill } from "@/components/market/market-alignment-role-pill";
import { resolveOtherPartyMarketRole } from "@/lib/globe/market/market-intent-role";

type PeerThreadRoomClientProps = {
  peerThreadId: string;
};

function PeerThreadRoomBody({ peerThreadId }: PeerThreadRoomClientProps) {
  const copy = useCopy();
  const searchParams = useSearchParams();
  const experienceEventId = searchParams.get("experience")?.trim() || null;
  const experienceTitle = searchParams.get("experienceTitle")?.trim() || null;
  const experienceDate = searchParams.get("experienceDate")?.trim() || null;
  const experiencePlace = searchParams.get("experiencePlace")?.trim() || null;
  const experienceDiscussion = Boolean(experienceTitle);
  const experienceBackHref = buildExperienceRoomBackHref(experienceEventId);
  const [profileOpen, setProfileOpen] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [groupMetaName, setGroupMetaName] = useState<string | null>(null);
  const [groupInviteCode, setGroupInviteCode] = useState<string | null>(null);
  const [marketHandshake, setMarketHandshake] = useState<MarketHandshakeRoomState | null>(
    null,
  );
  const [marketStartBusy, setMarketStartBusy] = useState(false);
  const roster = useMemo(() => readPinnedRoster(), []);
  const [contact, setContact] = useState<PeerContact | null>(() =>
    getPeerContactById(peerThreadId),
  );
  const refreshContact = useCallback(() => {
    setContact(getPeerContactById(peerThreadId));
  }, [peerThreadId]);
  const hubSlot = findSlotByPeerId(roster, peerThreadId);
  const isGroup = isGroupThreadId(peerThreadId);
  const isBridgeContextRoom = isBridgeContextThreadId(peerThreadId);
  const phoneDm = isRegisteredPeerDmThread(peerThreadId);

  useEffect(() => {
    if (!phoneDm || isGroup) {
      setMarketHandshake(null);
      return;
    }
    void fetchMarketHandshakeRoomRemote(peerThreadId)
      .then((state) => {
        setMarketHandshake(state);
      })
      .catch(() => setMarketHandshake(null));
  }, [isGroup, peerThreadId, phoneDm]);

  const refreshMarketHandshake = useCallback(async () => {
    const refreshed = await fetchMarketHandshakeRoomRemote(peerThreadId);
    setMarketHandshake(refreshed);
    return refreshed;
  }, [peerThreadId]);

  const onStartMarketChat = useCallback(async () => {
    if (!marketHandshake?.id || marketStartBusy) {
      return;
    }
    setMarketStartBusy(true);
    try {
      await startMarketHandshakeChatRemote({ handshakeId: marketHandshake.id });
      const refreshed = await refreshMarketHandshake();
      if (refreshed) {
        setMarketHandshake(refreshed);
      }
      toast.success(copy.globe.marketAlignBridgeToast);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : copy.globe.marketAlignBridgeFail;
      toast.error(message);
    } finally {
      setMarketStartBusy(false);
    }
  }, [copy.globe.marketAlignBridgeFail, copy.globe.marketAlignBridgeToast, marketHandshake?.id, marketStartBusy, refreshMarketHandshake]);

  useEffect(() => {
    refreshContact();
  }, [refreshContact]);

  useEffect(() => {
    if (contact || !phoneDm || isGroup) {
      return;
    }
    void fetchPeerThreadMeta(peerThreadId)
      .then((meta) => {
        const added = addPeerContact({
          peerThreadId,
          displayName: meta.displayName?.trim() || "친구",
        });
        if (added.ok) {
          setContact(added.contact);
        }
      })
      .catch(() => {});
  }, [contact, phoneDm, isGroup, peerThreadId]);
  const { profile, loading: profileLoading, reload: reloadProfile } =
    useDmPeerProfile(peerThreadId, phoneDm && !isGroup);

  useEffect(() => {
    if (!isGroup) {
      return;
    }
    void fetchPeerThreadMeta(peerThreadId)
      .then((meta) => {
        setGroupMetaName(meta.displayName?.trim() || null);
        setGroupInviteCode(meta.inviteCode?.trim() || null);
      })
      .catch(() => {});
  }, [isGroup, peerThreadId]);

  useEffect(() => {
    if (isGroup) {
      void markPeerThreadReadRemote(peerThreadId).catch(() => {});
      return;
    }
    if (!phoneDm) {
      return;
    }
    void markPeerThreadReadRemote(peerThreadId)
      .then(() => reloadProfile())
      .catch(() => {});
    void syncFeedSlotFromRoomRemote(peerThreadId)
      .then(() => emitFeedSlotsRefresh())
      .catch(() => {});
  }, [phoneDm, isGroup, peerThreadId, reloadProfile]);

  const displayName = isGroup
    ? groupMetaName || "단톡"
    : profile?.displayName?.trim() ||
      contact?.displayName ||
      hubSlot?.displayName ||
      "친구";

  const alignmentPeerRole = useMemo(
    () => resolveOtherPartyMarketRole(marketHandshake?.viewerRole ?? null),
    [marketHandshake?.viewerRole],
  );
  const showAlignmentRolePill = Boolean(
    marketHandshake && !marketHandshake.completed && alignmentPeerRole,
  );
  const marketQuickReplies = useMemo(() => {
    if (
      !marketHandshake ||
      marketHandshake.viewerRole !== "seeking" ||
      marketHandshake.chatLocked ||
      marketHandshake.completed
    ) {
      return [];
    }
    return listMarketChatQuickReplies(copy.globe.field);
  }, [copy.globe.field, marketHandshake]);

  const { settings, setAiLens } = usePeerThreadSettings({
    peerThreadId,
    displayName,
  });

  const policyInput = useMemo(
    () => ({
      settings,
      roster,
    }),
    [settings, roster],
  );

  const toggleAiLens = (next: boolean) => {
    setAiLens(next);
    if (next && shouldShowLensFirstCoach()) {
      markLensFirstCoachShown();
      toast.success(copy.product.lensCoachOn, {
        description: copy.product.lensCoachSub,
        duration: 5500,
      });
    }
  };

  const headerLongPress = useLongPress({
    onLongPress: () => toggleAiLens(!settings.aiLensEnabled),
    onTap: phoneDm
      ? () => setProfileOpen(true)
      : isGroup
        ? () => setGroupInfoOpen(true)
        : undefined,
  });

  if (!isGroup && !phoneDm && !contact && !hubSlot && !isBridgeContextRoom) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          이 친구는 목록에 없어요. 친구 탭에서 추가해 주세요
        </p>
        <Link href="/peers" className="text-sm font-semibold text-primary">
          친구 추가하기
        </Link>
      </div>
    );
  }


  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <header className="relative z-20 flex h-11 shrink-0 items-center border-b border-border/80 bg-card/95 px-0.5 pb-0 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
        <Link
          href={experienceDiscussion ? experienceBackHref : "/peers"}
          className="flex size-10 items-center justify-center text-foreground"
          aria-label={experienceDiscussion ? "경험으로" : "뒤로"}
        >
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        {experienceDiscussion && experienceTitle ? (
          <ExperienceDiscussionHeader
            title={experienceTitle}
            date={experienceDate}
            place={experiencePlace}
          />
        ) : phoneDm ? (
          <button
            type="button"
            {...headerLongPress}
            className={cn(
              "relative flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left",
              settings.aiLensEnabled &&
                "after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:bg-cyan-400/50 after:blur-[2px]",
            )}
            aria-label={
              settings.aiLensEnabled
                ? `${displayName} · AI 렌즈 켜짐 (길게 눌러 끄기)`
                : `${displayName} · 길게 눌러 AI 렌즈`
            }
          >
            <span className="min-w-0 truncate text-[16px] font-medium text-foreground">
              {displayName}
            </span>
            {showAlignmentRolePill && alignmentPeerRole ? (
              <MarketAlignmentRolePill role={alignmentPeerRole} size="xs" />
            ) : null}
            {settings.aiLensEnabled ? (
              <span className="inline-block size-1.5 shrink-0 translate-y-[-1px] rounded-full bg-cyan-400/80" />
            ) : null}
          </button>
        ) : (
          <button
            type="button"
            {...headerLongPress}
            className={cn(
              "relative min-w-0 flex-1 truncate py-1 text-left text-[16px] font-medium text-foreground",
              settings.aiLensEnabled &&
                "after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:bg-cyan-400/50 after:blur-[2px]",
            )}
            aria-label={
              settings.aiLensEnabled
                ? `${displayName} · 단톡 정보 (탭) · AI 렌즈 켜짐`
                : `${displayName} · 단톡 정보 (탭) · 길게 눌러 AI 렌즈`
            }
          >
            {displayName}
            {settings.aiLensEnabled ? (
              <span className="ml-1.5 inline-block size-1.5 translate-y-[-1px] rounded-full bg-cyan-400/80 align-middle" />
            ) : null}
          </button>
        )}
        {experienceDiscussion ? null : (
          <AiLensToggle
            enabled={settings.aiLensEnabled}
            onChange={toggleAiLens}
            size="sm"
            className="mr-2"
          />
        )}
      </header>

      <PeerPublicProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={profile}
        fallbackName={displayName}
        loading={profileLoading}
        peerThreadId={peerThreadId}
        alignmentPeerRole={showAlignmentRolePill ? alignmentPeerRole : null}
      />

      {isGroup ? (
        <GroupInfoSheet
          open={groupInfoOpen}
          onOpenChange={setGroupInfoOpen}
          threadId={peerThreadId}
          displayName={displayName}
          inviteCode={groupInviteCode}
          onRenamed={(nextName) => {
            setGroupMetaName(nextName);
          }}
        />
      ) : null}

      {marketHandshake ? (
        <MarketHandshakeProductStrip handshake={marketHandshake} />
      ) : null}

      <PeerChatThreadShell
        peerThreadId={peerThreadId}
        displayName={displayName}
        hideLensBar={phoneDm || isGroup}
      >
        <PeerThreadChatPanel
          displayName={displayName}
          policyInput={policyInput}
          aiLensEnabled={experienceDiscussion ? false : settings.aiLensEnabled}
          readOnly={marketHandshake?.chatLocked}
          showAiMentionLink={isGroup || phoneDm || Boolean(contact)}
          peerAvatarUrl={isGroup ? null : profile?.avatarUrl}
          simpleDm={phoneDm && !isGroup}
          experienceDiscussion={experienceDiscussion}
          contextTalkEventId={experienceEventId}
          contextTalkTitle={experienceTitle}
          hideMarketHandshakeSeeds={Boolean(marketHandshake)}
          marketQuickReplies={marketQuickReplies}
        />
      </PeerChatThreadShell>

      {marketHandshake?.canStartChat ? (
        <MarketHandshakeStartBar busy={marketStartBusy} onStart={() => void onStartMarketChat()} />
      ) : null}
      {marketHandshake?.chatLocked && marketHandshake.viewerRole === "listing" ? (
        <MarketHandshakeLockedHint />
      ) : null}
    </div>
  );
}

export function PeerThreadRoomClient({ peerThreadId }: PeerThreadRoomClientProps) {
  return (
    <Suspense fallback={null}>
      <PeerThreadRoomBody peerThreadId={peerThreadId} />
    </Suspense>
  );
}
