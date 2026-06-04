"use client";

import { ArrowUp, ImagePlus, Loader2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { usePeerThreadChat } from "@/hooks/use-peer-thread-chat";
import type { PeerThreadPolicyInput } from "@/lib/context/peer-thread-types";
import { DmChatMessageSkeleton } from "@/components/peer-chat/dm-chat-message-skeleton";
import { PeerChatBubble } from "@/components/peer-chat/peer-chat-bubble";
import { PeerInviteBanner } from "@/components/peer-chat/peer-invite-banner";
import { isDmThreadId } from "@/lib/peer-chat/dm-thread";
import { DM_CHAT } from "@/lib/peer-chat/dm-chat-density";
import {
  shouldShowPeerMessageTime,
  shouldShowPeerProfileHeader,
} from "@/lib/peer-chat/message-time-visibility";
import { useDmPeerProfile } from "@/hooks/use-dm-peer-profile";
import { isRegisteredPeerDmThread } from "@/lib/peer-chat/peer-chat-client";
import { normalizePeerSyncError } from "@/lib/peer-chat/normalize-peer-sync-error";
import { shouldAnalyzePeerAiLens } from "@/lib/context/peer-thread-policy";
import { executeDeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/execute-lens-bubble";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import { LensMapPickerSheet } from "@/components/peer-chat/lens-map-picker-sheet";
import { usePeerAiLens } from "@/hooks/use-peer-ai-lens";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PeerThreadChatPanelProps = {
  displayName: string;
  policyInput: PeerThreadPolicyInput;
  aiLensEnabled: boolean;
  readOnly?: boolean;
  showAiMentionLink?: boolean;
  peerAvatarUrl?: string | null;
  /** 카톡보다 단순한 1:1 DM UI */
  simpleDm?: boolean;
};

export function PeerThreadChatPanel({
  displayName,
  policyInput,
  aiLensEnabled,
  readOnly = false,
  simpleDm = false,
  peerAvatarUrl = null,
}: PeerThreadChatPanelProps) {
  const threadId = policyInput.settings.peerThreadId;
  const phoneDm = isDmThreadId(threadId);
  const simple = simpleDm || phoneDm;
  const lensActive = shouldAnalyzePeerAiLens(policyInput);
  const { profile: peerProfileRemote } = useDmPeerProfile(
    threadId,
    phoneDm && isRegisteredPeerDmThread(threadId),
  );
  const peerProfile = {
    displayName:
      peerProfileRemote?.displayName?.trim() ||
      displayName.trim() ||
      "친구",
    avatarUrl: peerProfileRemote?.avatarUrl ?? peerAvatarUrl ?? null,
    rimvioId: peerProfileRemote?.rimvioId ?? null,
  };
  const {
    messages,
    canSend,
    send,
    inviteUrl,
    inviteCode,
    syncError,
    aiBusy,
    imageBusy,
    sendImage,
    canSendImage,
    messagesHydrating,
  } = usePeerThreadChat(policyInput);
  const { anchorMessageId, candidates: lensCandidates } = usePeerAiLens({
    messages,
    enabled: lensActive && !readOnly,
  });
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const composerBusy = aiBusy || imageBusy;
  const scrollBehaviorRef = useRef<ScrollBehavior>("auto");
  const [messagesVisible, setMessagesVisible] = useState(false);
  const [mapPicker, setMapPicker] = useState<{
    open: boolean;
    place: string | null;
  }>({ open: false, place: null });

  const focusComposer = useCallback(() => {
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el || readOnly || !canSend || composerBusy) {
        return;
      }
      el.focus({ preventScroll: true });
    });
  }, [readOnly, canSend, composerBusy]);

  useEffect(() => {
    scrollBehaviorRef.current = "auto";
    setMessagesVisible(messages.length > 0);
  }, [threadId]);

  useEffect(() => {
    if (messagesHydrating && messages.length === 0) {
      return;
    }
    if (messages.length > 0 && !messagesHydrating && !messagesVisible) {
      requestAnimationFrame(() => setMessagesVisible(true));
    }
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({
        behavior: scrollBehaviorRef.current,
      });
      scrollBehaviorRef.current = "smooth";
    }
  }, [messages.length, aiBusy, messagesHydrating, threadId, messagesVisible]);

  const showSkeleton = messagesHydrating && messages.length === 0;
  const showEmptyHint =
    !messagesHydrating && messages.length === 0 && !showSkeleton;

  useEffect(() => {
    if (canSend && !readOnly) {
      focusComposer();
    }
  }, [canSend, readOnly, focusComposer]);

  const resizeComposer = useCallback(() => {
    const el = inputRef.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, simple ? 96 : 128)}px`;
  }, []);

  useEffect(() => {
    resizeComposer();
  }, [text, resizeComposer]);

  const submit = useCallback(async () => {
    const body = text.trim();
    if (!body || !canSend || readOnly || composerBusy) {
      return;
    }
    setText("");
    resizeComposer();
    focusComposer();
    void send(body, "me").then(() => focusComposer());
  }, [text, canSend, readOnly, composerBusy, send, focusComposer, resizeComposer]);

  const handleImageFile = useCallback(
    async (file: File | null) => {
      if (!file || !canSendImage || readOnly || composerBusy) {
        return;
      }
      const caption = text.trim();
      setText("");
      resizeComposer();
      const sent = await sendImage(file, caption || undefined);
      if (sent) {
        focusComposer();
      }
    },
    [
      canSendImage,
      readOnly,
      composerBusy,
      text,
      sendImage,
      resizeComposer,
      focusComposer,
    ],
  );

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

  const handleLensSelect = (candidate: DeepLinkBubbleCandidate) => {
    const result = executeDeepLinkBubbleCandidate(candidate, {
      sourceMessageId: anchorMessageId ?? undefined,
      peerDisplayName: displayName,
    });
    if (result.openMapPicker?.place) {
      setMapPicker({ open: true, place: result.openMapPicker.place });
    }
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        simple ? "bg-[#0f0f0f]" : "rimvio-dm-chat-bg",
      )}
    >
      {!readOnly && !phoneDm ? (
        <PeerInviteBanner inviteUrl={inviteUrl} inviteCode={inviteCode} />
      ) : null}

      {syncError ? (
        <p className="px-3 py-1.5 text-center text-[11px] text-amber-200/90">
          {normalizePeerSyncError(syncError)}
        </p>
      ) : null}

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          simple ? DM_CHAT.listPad : "px-4 py-4",
        )}
      >
        {showSkeleton ? (
          <DmChatMessageSkeleton />
        ) : showEmptyHint ? (
          <p
            className={cn(
              "text-center text-white/35",
              simple ? "py-8 text-sm" : "py-16 text-base",
            )}
          >
            {simple ? "메시지를 입력하세요" : `${displayName}와 대화해요`}
          </p>
        ) : (
          <ul
            className={cn(
              "flex flex-col",
              simple ? DM_CHAT.listGap : "gap-3",
              messagesHydrating
                ? "opacity-100"
                : cn(
                    "transition-opacity duration-200",
                    messagesVisible ? "opacity-100" : "opacity-0",
                  ),
            )}
          >
            {messages.map((message, index) => (
              <PeerChatBubble
                key={message.id}
                message={message}
                simple={simple}
                showTime={shouldShowPeerMessageTime(messages, index)}
                showPeerProfileHeader={shouldShowPeerProfileHeader(
                  messages,
                  index,
                )}
                peerProfile={peerProfile}
                lensCandidates={
                  message.id === anchorMessageId ? lensCandidates : []
                }
                onLensSelect={handleLensSelect}
                lensDisabled={aiBusy}
              />
            ))}
            {aiBusy ? (
              <li className="flex justify-end">
                <span
                  className={cn(
                    "rounded-full bg-[#2c2c2e] text-white/50",
                    simple ? "px-2 py-0.5 text-[12px]" : "px-3 py-2 text-[13px]",
                  )}
                >
                  …
                </span>
              </li>
            ) : null}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <div
        className={cn(
          "shrink-0 border-t",
          simple
            ? "border-white/[0.08] bg-[#0f0f0f] px-2 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
            : "rimvio-dm-composer px-3 pb-3 pt-2",
        )}
      >
        <form
          onSubmit={handleSubmit}
          className={cn("flex items-end", simple ? "gap-1.5" : "gap-2.5")}
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              event.target.value = "";
              void handleImageFile(file);
            }}
          />
          {canSendImage && !readOnly ? (
            <button
              type="button"
              aria-label="사진 보내기"
              disabled={composerBusy}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => imageInputRef.current?.click()}
              className={cn(
                "mb-px flex shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white disabled:opacity-30",
                simple ? DM_CHAT.sendSize : "size-11",
              )}
            >
              {imageBusy ? (
                <Loader2
                  className={cn(simple ? "size-4" : "size-5", "animate-spin")}
                  aria-hidden
                />
              ) : (
                <ImagePlus
                  className={cn(simple ? "size-5" : "size-6")}
                  strokeWidth={2}
                  aria-hidden
                />
              )}
            </button>
          ) : null}
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            disabled={!canSend || readOnly || composerBusy}
            placeholder={readOnly ? "읽기 전용" : "메시지"}
            className={cn(
              "flex-1 resize-none overflow-y-auto outline-none",
              simple
                ? cn(
                    DM_CHAT.composerMinH,
                    DM_CHAT.composerText,
                    DM_CHAT.composerPad,
                    "max-h-24 rounded-2xl bg-[#1c1c1e] text-[#f5f5f5] placeholder:text-white/30",
                  )
                : "max-h-32 min-h-[48px] rounded-xl bg-rimvio-surface-muted px-4 py-3 text-base",
            )}
          />
          <button
            type="button"
            disabled={!canSend || !text.trim() || composerBusy}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void submit()}
            className={cn(
              "mb-px flex shrink-0 items-center justify-center rounded-full disabled:opacity-30",
              simple
                ? cn(DM_CHAT.sendSize, "bg-[#FEE500] text-[#191919]")
                : "rimvio-dm-send-btn size-11 text-white",
            )}
            aria-label="보내기"
          >
            {aiBusy ? (
              <Loader2
                className={cn(simple ? "size-4" : "size-5", "animate-spin")}
                aria-hidden
              />
            ) : (
              <ArrowUp
                className={cn(simple ? "size-4 stroke-[2.5]" : "size-6 stroke-[2.5]")}
                aria-hidden
              />
            )}
          </button>
        </form>
      </div>

      <LensMapPickerSheet
        open={mapPicker.open}
        place={mapPicker.place}
        onOpenChange={(open) =>
          setMapPicker((prev) => ({ ...prev, open, place: open ? prev.place : null }))
        }
      />
    </div>
  );
}
