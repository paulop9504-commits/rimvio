"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { useAuth } from "@/hooks/use-auth";
import {
  appendPeerMessage,
  readPeerMessageLog,
  replacePeerMessageLog,
} from "@/lib/context/peer-message-log";
import type { PeerMessage, PeerMessageAuthor } from "@/lib/context/peer-message-types";
import { shouldPersistPeerMessageLog } from "@/lib/context/peer-thread-policy";
import type { PeerThreadPolicyInput } from "@/lib/context/peer-thread-types";
import {
  mapPeerMessageRow,
  mergePeerMessages,
  mergePeerMessagesBatch,
  sortPeerMessages,
} from "@/lib/peer-chat/message-mapper";
import {
  takePrefetchedMessages,
} from "@/lib/peer-chat/message-prefetch-cache";
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

function initialMessages(
  threadId: string,
  canPersist: boolean,
): PeerMessage[] {
  const prefetched = takePrefetchedMessages(threadId);
  if (prefetched?.length) {
    return sortPeerMessages(prefetched);
  }
  if (!canPersist) {
    return [];
  }
  return readPeerMessageLog(threadId).messages;
}

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

  const [messages, setMessages] = useState<PeerMessage[]>(() =>
    initialMessages(threadId, canPersist),
  );
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [messagesHydrating, setMessagesHydrating] = useState(useCloud);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const hydrateGen = useRef(0);

  const refreshLocal = useCallback(() => {
    if (!canPersist) {
      setMessages([]);
      return;
    }
    setMessages(readPeerMessageLog(threadId).messages);
  }, [canPersist, threadId]);

  useEffect(() => {
    setMessages(initialMessages(threadId, canPersist));
    setCloudReady(false);
    setMessagesHydrating(useCloud);
    hydrateGen.current += 1;
  }, [threadId, canPersist, useCloud]);

  useEffect(() => {
    if (!useCloud) {
      setCloudReady(false);
      setMessagesHydrating(false);
      setInviteCode(null);
      refreshLocal();
      return;
    }

    const generation = ++hydrateGen.current;
    let cancelled = false;

    void (async () => {
      try {
        setSyncError(null);
        setMessagesHydrating(true);

        const [ensured, remote] = await Promise.all([
          ensurePeerThreadRemote({ threadId, displayName }),
          fetchPeerMessages(threadId).catch(async () => {
            await ensurePeerThreadRemote({ threadId, displayName });
            return fetchPeerMessages(threadId);
          }),
        ]);

        if (cancelled || generation !== hydrateGen.current) {
          return;
        }

        setInviteCode(ensured.inviteCode);
        setMessages((current) => {
          const merged = mergePeerMessagesBatch(current, remote);
          if (canPersist && merged.length > 0) {
            replacePeerMessageLog(threadId, merged);
          }
          return merged;
        });
        setCloudReady(true);
      } catch (error) {
        if (!cancelled && generation === hydrateGen.current) {
          setSyncError(
            normalizePeerSyncError(
              error instanceof Error ? error.message : undefined,
            ),
          );
          refreshLocal();
        }
      } finally {
        if (!cancelled && generation === hydrateGen.current) {
          setMessagesHydrating(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [useCloud, threadId, displayName, refreshLocal, canPersist]);

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
            setMessages((current) => {
              const merged = mergePeerMessages(current, mapped);
              if (canPersist) {
                replacePeerMessageLog(threadId, merged);
              }
              return merged;
            });
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
  }, [useCloud, supabase, cloudReady, threadId, user?.id, canPersist]);

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
        setMessages((current) => {
          const merged = mergePeerMessages(current, message);
          if (canPersist) {
            replacePeerMessageLog(threadId, merged);
          }
          return merged;
        });
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
    [useCloud, cloudReady, threadId, displayName, canPersist],
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
        setMessages((current) => {
          const merged = mergePeerMessages(current, message);
          if (canPersist) {
            replacePeerMessageLog(threadId, merged);
          }
          return merged;
        });
        return message;
      } finally {
        setAiBusy(false);
      }
    },
    [useCloud, cloudReady, threadId, displayName, canPersist],
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
    messagesHydrating,
  };
}
