"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PeerPublicProfileSheet } from "@/components/peer-chat/peer-public-profile-sheet";
import { useDmPeerProfile } from "@/hooks/use-dm-peer-profile";
import {
  isRegisteredPeerDmThread,
  markPeerThreadReadRemote,
  syncFeedSlotFromRoomRemote,
} from "@/lib/peer-chat/peer-chat-client";
import { emitFeedSlotsRefresh } from "@/lib/feed/feed-slots-events";
import { UNPIN_PEER_RETENTION_DAYS } from "@/lib/context/hub-room-retention";
import { getPeerContactById } from "@/lib/context/peer-contact-store";
import { purgePendingLabel } from "@/lib/context/pinned-peer-roster";
import { findSlotByPeerId } from "@/lib/context/pinned-peer-roster";
import {
  getOrCreatePeerThreadSettings,
  readPinnedRoster,
} from "@/lib/context/peer-thread-settings-store";
import { PeerChatThreadShell } from "@/components/peer-chat/peer-chat-thread-shell";
import { PeerThreadChatPanel } from "@/components/peer-chat/peer-thread-chat-panel";
import { PeerThreadHubPinBar } from "@/components/peer-chat/peer-thread-hub-pin-bar";

type PeerThreadRoomClientProps = {
  peerThreadId: string;
};

export function PeerThreadRoomClient({ peerThreadId }: PeerThreadRoomClientProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const roster = useMemo(() => readPinnedRoster(), []);
  const contact = useMemo(() => getPeerContactById(peerThreadId), [peerThreadId]);
  const hubSlot = findSlotByPeerId(roster, peerThreadId);
  const phoneDm = isRegisteredPeerDmThread(peerThreadId);
  const { profile, loading: profileLoading, reload: reloadProfile } =
    useDmPeerProfile(peerThreadId, phoneDm);

  useEffect(() => {
    if (!phoneDm) {
      return;
    }
    void markPeerThreadReadRemote(peerThreadId)
      .then(() => reloadProfile())
      .catch(() => {});
    void syncFeedSlotFromRoomRemote(peerThreadId)
      .then(() => emitFeedSlotsRefresh())
      .catch(() => {});
  }, [phoneDm, peerThreadId, reloadProfile]);

  const displayName =
    profile?.displayName?.trim() ||
    contact?.displayName ||
    hubSlot?.displayName ||
    "친구";

  const policyInput = useMemo(
    () => ({
      settings: getOrCreatePeerThreadSettings({
        peerThreadId,
        displayName,
      }),
      roster,
    }),
    [peerThreadId, displayName, roster],
  );

  if (!contact && !hubSlot) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          이 친구는 목록에 없어요. ROOM 허브에서 친구를 추가해 주세요
        </p>
        <Link href="/peers" className="text-sm font-semibold text-rimvio-neon-cyan">
          ROOM 으로
        </Link>
      </div>
    );
  }

  const purgeLabel = hubSlot ? purgePendingLabel(hubSlot) : null;
  const connected = hubSlot?.connection === "connected";
  const pinned = connected;
  const unpinnedContact = Boolean(contact) && !pinned;
  const showHubNotices = !phoneDm;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#0f0f0f]">
      <header className="flex h-11 shrink-0 items-center border-b border-white/[0.08] bg-[#0f0f0f] px-0.5 pb-0 pt-[env(safe-area-inset-top,0px)]">
        <Link
          href="/peers"
          className="flex size-10 items-center justify-center text-white/90"
          aria-label="뒤로"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        {phoneDm ? (
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="min-w-0 flex-1 truncate py-1 text-left text-[16px] font-medium text-white"
            aria-label={`${displayName} 프로필`}
          >
            {displayName}
          </button>
        ) : (
          <div className="min-w-0 flex-1 truncate py-1 text-[16px] font-medium text-white">
            {displayName}
          </div>
        )}
        <PeerThreadHubPinBar
          peerThreadId={peerThreadId}
          displayName={displayName}
          friendUserId={phoneDm ? profile?.userId : null}
          variant="header"
        />
      </header>

      <PeerPublicProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={profile}
        fallbackName={displayName}
        loading={profileLoading}
      />

      {showHubNotices && hubSlot?.connection === "purge_pending" ? (
        <p className="bg-amber-950/40 px-3 py-2 text-[11px] text-amber-200">
          AI 허브가 해제되어 {purgeLabel ?? `${UNPIN_PEER_RETENTION_DAYS}일 후`}{" "}
          대화가 삭제돼요
        </p>
      ) : null}

      {showHubNotices && unpinnedContact ? (
        <p className="px-3 py-1.5 text-[11px] text-white/40">
          AI 허브에 꽂인 친구만 @import 가능
        </p>
      ) : null}

      <PeerChatThreadShell
        peerThreadId={peerThreadId}
        displayName={displayName}
        hideLensBar={phoneDm}
      >
        <PeerThreadChatPanel
          displayName={displayName}
          policyInput={policyInput}
          aiLensEnabled={policyInput.settings.aiLensEnabled}
          readOnly={hubSlot?.connection === "purge_pending"}
          showAiMentionLink={pinned}
          peerAvatarUrl={profile?.avatarUrl}
          simpleDm={phoneDm}
        />
      </PeerChatThreadShell>
    </div>
  );
}
