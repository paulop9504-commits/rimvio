"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readGlobeChatSession,
  subscribeGlobeChatSessionChange,
} from "@/lib/globe/chat/globe-chat-session-store";
import type { GlobeChatMessage } from "@/lib/globe/chat/globe-chat-session-types";

export function useGlobeChatSession(graphId: string | null | undefined) {
  const [messages, setMessages] = useState<readonly GlobeChatMessage[]>(() =>
    readGlobeChatSession(graphId)?.messages ?? [],
  );

  const sync = useCallback(() => {
    setMessages(readGlobeChatSession(graphId)?.messages ?? []);
  }, [graphId]);

  useEffect(() => {
    sync();
    return subscribeGlobeChatSessionChange((detail) => {
      if (!graphId?.trim() || detail.graphId === graphId.trim()) {
        sync();
      }
    });
  }, [graphId, sync]);

  return { messages };
}
