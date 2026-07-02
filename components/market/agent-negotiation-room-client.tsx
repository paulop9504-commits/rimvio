"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AgentNegotiationRoomPanel } from "@/components/market/agent-negotiation-room-panel";
import { useCopy } from "@/hooks/use-copy";
import { subscribeAgentCoordinationRoomRealtime } from "@/lib/globe/market/coordination/client/agent-coordination-realtime";
import {
  loadAgentNegotiationRoomRemote,
  subscribeAgentNegotiationRooms,
} from "@/lib/globe/market/coordination/agent-negotiation-store";
import type { AgentNegotiationRoomRecord } from "@/lib/globe/market/coordination/agent-negotiation-types";

export type AgentNegotiationRoomClientProps = {
  handshakeId: string;
};

export function AgentNegotiationRoomClient({
  handshakeId,
}: AgentNegotiationRoomClientProps) {
  const copy = useCopy();
  const router = useRouter();
  const ui = copy.globe.coordination;
  const [room, setRoom] = useState<AgentNegotiationRoomRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await loadAgentNegotiationRoomRemote(handshakeId);
    if (next) {
      setRoom(next);
    }
    setLoading(false);
  }, [handshakeId]);

  useEffect(() => {
    void refresh();
    const unsubscribeStore = subscribeAgentNegotiationRooms(() => {
      void refresh();
    });
    const unsubscribeRealtime = subscribeAgentCoordinationRoomRealtime(handshakeId, () => {
      void refresh();
    });
    return () => {
      unsubscribeStore();
      unsubscribeRealtime();
    };
  }, [handshakeId, refresh]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[14px] text-[#8b95a1]">
        {ui.typingHint}
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-[16px] font-semibold text-[#191f28]">{ui.listEmptyTitle}</p>
        <button
          type="button"
          onClick={() => router.push("/peers?lane=ai")}
          className="rounded-full bg-[#f2f4f6] px-5 py-2.5 text-[14px] font-semibold text-[#191f28]"
        >
          {copy.peers.friendRail.alignmentSlots.emptyCta}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <header className="flex shrink-0 items-center gap-2 border-b border-[#f2f4f6] px-3 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => router.push("/peers?lane=ai")}
          className="flex size-9 items-center justify-center rounded-full text-[#4e5968] active:bg-[#f2f4f6]"
          aria-label={copy.globe.field.backAria}
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-[17px] font-semibold text-[#191f28]">
          {ui.roomTitle}
        </p>
      </header>
      <AgentNegotiationRoomPanel
        room={room}
        onRoomChange={setRoom}
        onRefresh={refresh}
        className="min-h-0 flex-1"
      />
    </div>
  );
}
