"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchPeerReadState,
  isRegisteredPeerDmThread,
} from "@/lib/peer-chat/peer-chat-client";

const POLL_MS = 8_000;

export function usePeerReadReceipt(threadId: string, enabled = true) {
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !isRegisteredPeerDmThread(threadId)) {
      setPeerLastReadAt(null);
      return null;
    }
    try {
      const next = await fetchPeerReadState(threadId);
      setPeerLastReadAt(next);
      return next;
    } catch {
      return null;
    }
  }, [threadId, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !isRegisteredPeerDmThread(threadId)) {
      return;
    }
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, threadId, refresh]);

  return { peerLastReadAt, setPeerLastReadAt, refreshPeerRead: refresh };
}
