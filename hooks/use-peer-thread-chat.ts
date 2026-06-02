"use client";

import { useCallback, useState } from "react";
import { appendPeerMessage, readPeerMessageLog } from "@/lib/context/peer-message-log";
import type { PeerMessage, PeerMessageAuthor } from "@/lib/context/peer-message-types";
import { shouldPersistPeerMessageLog } from "@/lib/context/peer-thread-policy";
import type { PeerThreadPolicyInput } from "@/lib/context/peer-thread-types";

export function usePeerThreadChat(policy: PeerThreadPolicyInput) {
  const [messages, setMessages] = useState<PeerMessage[]>(() => {
    if (!shouldPersistPeerMessageLog(policy)) {
      return [];
    }
    return readPeerMessageLog(policy.settings.peerThreadId).messages;
  });

  const refresh = useCallback(() => {
    if (!shouldPersistPeerMessageLog(policy)) {
      setMessages([]);
      return;
    }
    setMessages(readPeerMessageLog(policy.settings.peerThreadId).messages);
  }, [policy]);

  const send = useCallback(
    (body: string, author: PeerMessageAuthor = "me") => {
      const trimmed = body.trim();
      if (!trimmed || !shouldPersistPeerMessageLog(policy)) {
        return null;
      }
      const message = appendPeerMessage({
        peerThreadId: policy.settings.peerThreadId,
        author,
        body: trimmed,
      });
      setMessages((current) => [...current, message]);
      return message;
    },
    [policy]
  );

  return {
    messages,
    canSend: shouldPersistPeerMessageLog(policy),
    send,
    refresh,
  };
}
