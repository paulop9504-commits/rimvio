"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { useAgentNegotiationRooms } from "@/hooks/use-agent-negotiation-rooms";
import { previewAgentNegotiationLog } from "@/lib/globe/market/coordination/agent-negotiation-room-engine";
import type { AgentNegotiationRoomRecord } from "@/lib/globe/market/coordination/agent-negotiation-types";
import { agentNegotiationRoomPath } from "@/lib/globe/market/coordination/agent-negotiation-store";
import { formatPeerChatListTime } from "@/lib/peer-chat/format-peer-chat-list-time";
import { PEERS_CHAT_LIST } from "@/lib/peer-chat/peers-chat-list-density";
import { cn } from "@/lib/utils";

function listPreviewForRoom(
  room: AgentNegotiationRoomRecord,
  labels: {
    listPreviewNegotiating: string;
    listPreviewWaitingYou: string;
    listPreviewPaused: string;
    listPreviewAgreed: string;
    listPreviewStuck: string;
    listPreviewApproved: string;
  },
): string {
  switch (room.state) {
    case "WAITING_USER_INPUT":
      return labels.listPreviewWaitingYou;
    case "PAUSED":
      return labels.listPreviewPaused;
    case "AGREED":
      return labels.listPreviewAgreed;
    case "STUCK":
      return labels.listPreviewStuck;
    case "APPROVED":
      return labels.listPreviewApproved;
    default:
      return previewAgentNegotiationLog(room) || labels.listPreviewNegotiating;
  }
}

export type PeerAiCoordinationListProps = {
  className?: string;
};

export function PeerAiCoordinationList({ className }: PeerAiCoordinationListProps) {
  const copy = useCopy();
  const { rooms } = useAgentNegotiationRooms();
  const ui = copy.globe.coordination;
  const labels = copy.peers.friendRail.aiCoordination;

  if (rooms.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-4 px-8 py-16 text-center",
          className,
        )}
      >
        <span className="flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#e8f3ff] to-[#dbeafe] shadow-sm ring-1 ring-[#3182f6]/10">
          <Sparkles className="size-7 text-[#3182f6]" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <p className="text-[16px] font-semibold text-[#191f28]">{ui.listEmptyTitle}</p>
          <p className="text-[13px] leading-relaxed text-[#6b7684]">{ui.listEmptyBody}</p>
        </div>
        <Link
          href="/"
          className="rounded-full bg-[#3182f6] px-6 py-2.5 text-[13px] font-semibold text-white shadow-sm active:scale-[0.98]"
        >
          {ui.listEmptyCta}
        </Link>
      </div>
    );
  }

  return (
    <ul className={className}>
      {rooms.map((room) => {
        const needsYou =
          room.state === "WAITING_USER_INPUT" || room.state === "PAUSED";
        const preview = listPreviewForRoom(room, labels);
        const href = agentNegotiationRoomPath(room.handshakeId);

        return (
          <li key={room.handshakeId} className="border-b border-[#f2f4f6]">
            <Link href={href} className={cn(PEERS_CHAT_LIST.row, needsYou && PEERS_CHAT_LIST.rowUnread)}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e8f3ff] to-[#dbeafe] text-[#2563eb]">
                <Sparkles className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <p
                    className={cn(
                      "min-w-0 flex-1 truncate",
                      PEERS_CHAT_LIST.name,
                      needsYou && PEERS_CHAT_LIST.nameUnread,
                    )}
                  >
                    {room.productTitle}
                  </p>
                  <span
                    className={cn(
                      PEERS_CHAT_LIST.time,
                      needsYou && PEERS_CHAT_LIST.timeUnread,
                    )}
                  >
                    {formatPeerChatListTime(room.updatedAtIso)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <p
                    className={cn(
                      "min-w-0 flex-1 truncate",
                      needsYou ? PEERS_CHAT_LIST.previewUnread : PEERS_CHAT_LIST.preview,
                    )}
                  >
                    {preview}
                  </p>
                  {needsYou ? <span className={PEERS_CHAT_LIST.unreadDot} aria-hidden /> : null}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
