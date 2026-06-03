"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useMemo } from "react";
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

type PeerThreadRoomClientProps = {
  peerThreadId: string;
};

export function PeerThreadRoomClient({ peerThreadId }: PeerThreadRoomClientProps) {
  const roster = useMemo(() => readPinnedRoster(), []);
  const contact = useMemo(() => getPeerContactById(peerThreadId), [peerThreadId]);
  const hubSlot = findSlotByPeerId(roster, peerThreadId);
  const displayName =
    contact?.displayName ?? hubSlot?.displayName ?? "친구";

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border bg-rimvio-surface/95 px-3 py-2">
        <Link
          href="/peers"
          className="flex size-9 items-center justify-center rounded-full active:bg-rimvio-surface-muted"
          aria-label="ROOM 으로"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold tracking-tight">{displayName}</p>
          <p className="text-[11px] text-muted-foreground">
            {connected
              ? `AI 허브 · 슬롯 ${(hubSlot?.slotIndex ?? 0) + 1}/5`
              : unpinnedContact
                ? "친구 · AI 허브 없음 (로컬 저장)"
                : purgeLabel ?? "허브 해제됨"}
          </p>
        </div>
      </div>

      {hubSlot?.connection === "purge_pending" ? (
        <p className="bg-amber-950/40 px-3 py-2 text-[11px] text-amber-200">
          AI 허브가 해제되어 {purgeLabel ?? `${UNPIN_PEER_RETENTION_DAYS}일 후`}{" "}
          대화가 삭제돼요. 연락처는 목록에 남아요
        </p>
      ) : null}

      {unpinnedContact ? (
        <p className="bg-rimvio-surface-muted px-3 py-2 text-[11px] text-muted-foreground">
          AI @import·렌즈는 AI 허브(5명)에 꽂인 친구만 가능해요
        </p>
      ) : null}

      <PeerChatThreadShell peerThreadId={peerThreadId} displayName={displayName}>
        <PeerThreadChatPanel
          displayName={displayName}
          policyInput={policyInput}
          aiLensEnabled={policyInput.settings.aiLensEnabled}
          readOnly={hubSlot?.connection === "purge_pending"}
          showAiMentionLink={pinned}
        />
      </PeerChatThreadShell>
    </div>
  );
}
