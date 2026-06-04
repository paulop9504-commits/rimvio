"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { useAuth } from "@/hooks/use-auth";
import { appendPeerMessage, readPeerMessageLog } from "@/lib/context/peer-message-log";
import type { PeerMessage, PeerMessageAuthor } from "@/lib/context/peer-message-types";
import { shouldPersistPeerMessageLog } from "@/lib/context/peer-thread-policy";
import type { PeerThreadPolicyInput } from "@/lib/context/peer-thread-types";
import {
  mapPeerMessageRow,
  mergePeerMessages,
  sortPeerMessages,
} from "@/lib/peer-chat/message-mapper";
import { parseOutgoingMessage } from "@/lib/chat-room/parse-ai-invoke";
import {
  buildPeerInviteUrl,
  ensurePeerThreadRemote,
  fetchPeerMessages,
  fetchPeerThreadMeta,
  invokePeerRoomAi,
  isRegisteredPeerDmThread,
  sendPeerMessageRemote,
  syncFeedSlotFromRoomRemote,
} from "@/lib/peer-chat/peer-chat-client";
import { emitFeedSlotsRefresh } from "@/lib/feed/feed-slots-events";
import type { PeerMessageRow } from "@/lib/peer-chat/types";
import { normalizePeerSyncError } from "@/lib/peer-chat/normalize-peer-sync-error";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { tryCreateClient } from "@/lib/supabase/client";

const PEER_MESSAGES_TABLE = "peer_messages";

export function usePeerThreadChat(policy: PeerThreadPolicyInput) {
  const { user, configured } = useAuth();
  const supabase = useMemo(
    () => (configured ? tryCreateClient() : null),
    [configured],
  );
  const threadId = policy.settings.peerThreadId;
  const displayName = policy.settings.displayName;
  const canPersist = shouldPersistPeerMessageLog(policy);
  const useCloud = Boolean(configured && user && canPersist);

  const [messages, setMessages] = useState<PeerMessage[]>(() => {
    if (!canPersist) {
      return [];
    }
    return readPeerMessageLog(threadId).messages;
  });
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const refreshLocal = useCallback(() => {
    if (!canPersist) {
      setMessages([]);
      return;
    }
    setMessages(readPeerMessageLog(threadId).messages);
  }, [canPersist, threadId]);

  useEffect(() => {
    if (!useCloud) {
      setCloudReady(false);
      setInviteCode(null);
      refreshLocal();
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        setSyncError(null);
        const ensured = await ensurePeerThreadRemote({
          threadId,
          displayName,
        });
        if (cancelled) {
          return;
        }
        setInviteCode(ensured.inviteCode);
        const remote = await fetchPeerMessages(threadId);
        if (cancelled) {
          return;
        }
        setMessages(sortPeerMessages(remote));
        setCloudReady(true);
      } catch (error) {
        if (!cancelled) {
          setSyncError(
            normalizePeerSyncError(
              error instanceof Error ? error.message : undefined,
            ),
          );
          refreshLocal();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [useCloud, threadId, displayName, refreshLocal]);

  useEffect(() => {
    if (!useCloud || !supabase || !cloudReady) {
      return;
    }

    let channel: RealtimeChannel;

    const subscribe = () => {
      channel = supabase
        .channel(`peer-messages:${threadId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: PEER_MESSAGES_TABLE,
            filter: `thread_id=eq.${threadId}`,
          },
          (payload) => {
            const row = (payload as RealtimePostgresChangesPayload<PeerMessageRow>)
              .new as PeerMessageRow | undefined;
            if (!row?.id || !row.thread_id) {
              return;
            }
            const mapped = mapPeerMessageRow(row, user?.id);
            setMessages((current) => mergePeerMessages(current, mapped));
            if (
              isRegisteredPeerDmThread(threadId) &&
              mapped.author !== "me"
            ) {
              void syncFeedSlotFromRoomRemote(threadId)
                .then(() => emitFeedSlotsRefresh())
                .catch(() => emitFeedSlotsRefresh());
            }
          },
        )
        .subscribe();
    };

    subscribe();

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [useCloud, supabase, cloudReady, threadId, user?.id]);

  const sendHuman = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) {
        return null;
      }

      if (useCloud && cloudReady) {
        const message = await sendPeerMessageRemote({
          threadId,
          displayName,
          body: trimmed,
        });
        setMessages((current) => mergePeerMessages(current, message));
        if (isRegisteredPeerDmThread(threadId)) {
          void syncFeedSlotFromRoomRemote(threadId)
            .then(() => emitFeedSlotsRefresh())
            .catch(() => emitFeedSlotsRefresh());
        }
        return message;
      }

      const message = appendPeerMessage({
        peerThreadId: threadId,
        author: "me",
        body: trimmed,
      });
      setMessages((current) => [...current, message]);
      return message;
    },
    [useCloud, cloudReady, threadId, displayName],
  );

  const invokeAi = useCallback(
    async (prompt: string) => {
      if (!useCloud || !cloudReady) {
        return null;
      }
      setAiBusy(true);
      try {
        const message = await invokePeerRoomAi({
          threadId,
          displayName,
          prompt,
        });
        setMessages((current) => mergePeerMessages(current, message));
        return message;
      } finally {
        setAiBusy(false);
      }
    },
    [useCloud, cloudReady, threadId, displayName],
  );

  const send = useCallback(
    async (body: string, author: PeerMessageAuthor = "me") => {
      const trimmed = body.trim();
      if (!trimmed || !canPersist || author !== "me") {
        return null;
      }

      const parsed = parseOutgoingMessage(trimmed);

      try {
        if (parsed.kind === "ai_invoke") {
          await sendHuman(parsed.body);
          return await invokeAi(parsed.prompt);
        }
        return await sendHuman(parsed.body);
      } catch (error) {
        setSyncError(
          error instanceof Error ? error.message : "메시지 전송에 실패했어요",
        );
        return null;
      }
    },
    [canPersist, sendHuman, invokeAi],
  );

  const inviteUrl = inviteCode ? buildPeerInviteUrl(inviteCode) : null;

  const refreshInvite = useCallback(async () => {
    if (!useCloud) {
      return null;
    }
    try {
      const meta = await fetchPeerThreadMeta(threadId);
      setInviteCode(meta.inviteCode);
      return meta.inviteCode;
    } catch {
      return null;
    }
  }, [useCloud, threadId]);

  return {
    messages,
    canSend: canPersist,
    send,
    refresh: refreshLocal,
    realtime: useCloud && cloudReady,
    inviteCode,
    inviteUrl,
    syncError,
    refreshInvite,
    aiBusy,
  };
}
