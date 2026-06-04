"use client";

import { ArrowUp, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { PeerChatBubble } from "@/components/peer-chat/peer-chat-bubble";
import { DmChatMessageSkeleton } from "@/components/peer-chat/dm-chat-message-skeleton";
import { usePeerThreadChat } from "@/hooks/use-peer-thread-chat";
import { getOrCreatePeerThreadSettings, readPinnedRoster } from "@/lib/context/peer-thread-settings-store";
import { DM_CHAT } from "@/lib/peer-chat/dm-chat-density";
import { shouldShowPeerMessageTime } from "@/lib/peer-chat/message-time-visibility";
import { normalizePeerSyncError } from "@/lib/peer-chat/normalize-peer-sync-error";
import { cn } from "@/lib/utils";

type FeedInlineDmPanelProps = {
  peerThreadId: string;
  displayName: string;
  className?: string;
};

/** 피드 인라인 — /peers/[id] room 과 동일 스레드·메시지 API */
export function FeedInlineDmPanel({
  peerThreadId,
  displayName,
  className,
}: FeedInlineDmPanelProps) {
  const roster = useMemo(() => readPinnedRoster(), []);
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

  const {
    messages,
    canSend,
    send,
    syncError,
    aiBusy,
    messagesHydrating,
  } = usePeerThreadChat(policyInput);

  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollBehaviorRef = useRef<ScrollBehavior>("auto");

  const focusComposer = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    scrollBehaviorRef.current = "auto";
    focusComposer();
  }, [peerThreadId, focusComposer]);

  useEffect(() => {
    if (messagesHydrating && messages.length === 0) {
      return;
    }
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({
        behavior: scrollBehaviorRef.current,
      });
      scrollBehaviorRef.current = "smooth";
    }
  }, [messages.length, aiBusy, messagesHydrating]);

  const submit = useCallback(async () => {
    const body = text.trim();
    if (!body || !canSend || aiBusy) {
      return;
    }
    setText("");
    await send(body, "me");
    focusComposer();
  }, [text, canSend, aiBusy, send, focusComposer]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  const showSkeleton = messagesHydrating && messages.length === 0;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0f0f0f]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-white/[0.08] px-2.5 py-1.5">
        <p className="truncate text-[12px] font-medium text-white/90">
          {displayName}
          <span className="ml-1.5 font-normal text-white/40">· 피드 톡</span>
        </p>
        <Link
          href={`/peers/${encodeURIComponent(peerThreadId)}`}
          className="shrink-0 text-[10px] text-white/45 underline-offset-2 hover:text-rimvio-neon-cyan hover:underline"
        >
          ROOM
        </Link>
      </div>

      {syncError ? (
        <p className="px-2 py-1 text-center text-[10px] text-amber-200/90">
          {normalizePeerSyncError(syncError)}
        </p>
      ) : null}

      <div className={cn("max-h-56 overflow-y-auto", DM_CHAT.listPad)}>
        {showSkeleton ? (
          <DmChatMessageSkeleton />
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-[11px] text-white/35">
            첫 메시지를 보내 보세요
          </p>
        ) : (
          <ul className={cn("flex flex-col", DM_CHAT.listGap)}>
            {messages.map((message, index) => (
              <PeerChatBubble
                key={message.id}
                message={message}
                simple
                showTime={shouldShowPeerMessageTime(messages, index)}
              />
            ))}
            {aiBusy ? (
              <li className="flex justify-end">
                <span className="rounded-full bg-[#2c2c2e] px-2 py-0.5 text-[12px] text-white/50">
                  …
                </span>
              </li>
            ) : null}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-1.5 border-t border-white/[0.08] px-2 py-1.5"
      >
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          enterKeyHint="send"
          autoComplete="off"
          disabled={!canSend || aiBusy}
          placeholder="메시지"
          className={cn(
            "max-h-20 flex-1 resize-none overflow-y-auto rounded-2xl bg-[#1c1c1e] outline-none",
            DM_CHAT.composerMinH,
            DM_CHAT.composerText,
            DM_CHAT.composerPad,
            "text-[#f5f5f5] placeholder:text-white/30",
          )}
        />
        <button
          type="button"
          disabled={!canSend || !text.trim() || aiBusy}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void submit()}
          className={cn(
            "mb-px flex shrink-0 items-center justify-center rounded-full bg-[#FEE500] text-[#191919] disabled:opacity-30",
            DM_CHAT.sendSize,
          )}
          aria-label="보내기"
        >
          {aiBusy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ArrowUp className="size-4 stroke-[2.5]" aria-hidden />
          )}
        </button>
      </form>
    </div>
  );
}
