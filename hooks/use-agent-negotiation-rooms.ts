"use client";

import { useSyncExternalStore, useEffect } from "react";
import { subscribeAgentCoordinationListRealtime } from "@/lib/globe/market/coordination/client/agent-coordination-realtime";
import {
  countActiveAgentNegotiationRooms,
  listAgentNegotiationRooms,
  refreshAgentNegotiationRoomsFromRemote,
  subscribeAgentNegotiationRooms,
} from "@/lib/globe/market/coordination/agent-negotiation-store";

const REMOTE_FALLBACK_POLL_MS = 60_000;

function getRoomsSnapshot() {
  return listAgentNegotiationRooms();
}

function getActiveCountSnapshot() {
  return countActiveAgentNegotiationRooms();
}

export function useAgentNegotiationRooms(input?: { pollRemote?: boolean }) {
  const pollRemote = input?.pollRemote !== false;

  useEffect(() => {
    if (!pollRemote) {
      return undefined;
    }
    void refreshAgentNegotiationRoomsFromRemote();
    const unsubscribeRealtime = subscribeAgentCoordinationListRealtime(() => {
      void refreshAgentNegotiationRoomsFromRemote();
    });
    const timer = window.setInterval(() => {
      void refreshAgentNegotiationRoomsFromRemote();
    }, REMOTE_FALLBACK_POLL_MS);
    return () => {
      unsubscribeRealtime();
      window.clearInterval(timer);
    };
  }, [pollRemote]);

  const rooms = useSyncExternalStore(
    subscribeAgentNegotiationRooms,
    getRoomsSnapshot,
    () => [],
  );
  const activeCount = useSyncExternalStore(
    subscribeAgentNegotiationRooms,
    getActiveCountSnapshot,
    () => 0,
  );
  return { rooms, activeCount, refresh: refreshAgentNegotiationRoomsFromRemote };
}
