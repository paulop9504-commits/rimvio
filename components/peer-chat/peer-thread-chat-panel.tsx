"use client";

import { ArrowUp, ImagePlus, Loader2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Fragment,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { usePeerThreadChat } from "@/hooks/use-peer-thread-chat";
import type { PeerMessage } from "@/lib/context/peer-message-types";
import type { PeerThreadPolicyInput } from "@/lib/context/peer-thread-types";
import { DmChatMessageSkeleton } from "@/components/peer-chat/dm-chat-message-skeleton";
import { ExperienceDiscussionMessage } from "@/components/experience/experience-discussion-message";
import { PeerChatBubble } from "@/components/peer-chat/peer-chat-bubble";
import { PeerInviteBanner } from "@/components/peer-chat/peer-invite-banner";
import { isDmThreadId } from "@/lib/peer-chat/dm-thread";
import { isGroupThreadId } from "@/lib/peer-chat/group-thread";
import { shouldShowPeerDateDivider } from "@/lib/peer-chat/peer-chat-date-divider";
import { PEER_CHAT_MEDIA_ACCEPT } from "@/lib/peer-chat/peer-chat-image-constants";
import { DM_CHAT } from "@/lib/peer-chat/dm-chat-density";
import {
  shouldShowPeerAvatarCluster,
  shouldShowPeerMessageTime,
} from "@/lib/peer-chat/message-time-visibility";
import { groupReadCountForMessage } from "@/lib/peer-chat/group-read-receipt";
import { shouldShowPeerSentCheck } from "@/lib/peer-chat/peer-read-receipt";
import { useDmPeerProfile } from "@/hooks/use-dm-peer-profile";
import { isRegisteredPeerDmThread } from "@/lib/peer-chat/peer-chat-client";
import { normalizePeerSyncError } from "@/lib/peer-chat/normalize-peer-sync-error";
import { shouldAnalyzePeerAiLens } from "@/lib/context/peer-thread-policy";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import { LensMapPickerSheet } from "@/components/peer-chat/lens-map-picker-sheet";
import { LensScheduleConfirmSheet } from "@/components/peer-chat/lens-schedule-confirm-sheet";
import { ContextTalkRoomPanel } from "@/components/peer-chat/context-talk-room-panel";
import { PeerContextMiniMap } from "@/components/peer-chat/peer-context-mini-map";
import { usePeerAiLens } from "@/hooks/use-peer-ai-lens";
import { PeerChatDateDivider } from "@/components/peer-chat/peer-chat-date-divider";
import { PeerDmKakaoComposer } from "@/components/peer-chat/peer-dm-kakao-composer";
import { MarketChatQuickReplyPills } from "@/components/market/market-chat-quick-reply-pills";
import { useLensBubbleActions } from "@/hooks/use-lens-bubble-actions";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { isMarketHandshakeSeedMessage } from "@/lib/globe/market/is-market-handshake-seed-message";

type PeerThreadChatPanelProps = {
  displayName: string;
  policyInput: PeerThreadPolicyInput;
  aiLensEnabled: boolean;
  readOnly?: boolean;
  /** Shown when user tries to send while readOnly (e.g. 맞춤 대화 잠금). */
  readOnlySendHint?: string | null;
  composerPlaceholder?: string | null;
  showAiMentionLink?: boolean;
  peerAvatarUrl?: string | null;
  /** 카톡보다 단순한 1:1 DM UI */
  simpleDm?: boolean;
  /** Experience ROOM — no bubbles, no read receipts. */
  experienceDiscussion?: boolean;
  /** Bridge-scoped Context Talk — map backdrop + scroll sync. */
  contextTalkEventId?: string | null;
  contextTalkTitle?: string | null;
  /** Handshake hero card already shows product — hide duplicate system seeds. */
  hideMarketHandshakeSeeds?: boolean;
  /** Karrot-style opener pills for marketplace seeker DM. */
  marketQuickReplies?: string[];
};

export function PeerThreadChatPanel({
  displayName,
  policyInput,
  aiLensEnabled,
  readOnly = false,
  readOnlySendHint = null,
  composerPlaceholder = null,
  simpleDm = false,
  peerAvatarUrl = null,
  experienceDiscussion = false,
  contextTalkEventId = null,
  contextTalkTitle = null,
  hideMarketHandshakeSeeds = false,
  marketQuickReplies = [],
}: PeerThreadChatPanelProps) {
  const threadId = policyInput.settings.peerThreadId;
  const phoneDm = isDmThreadId(threadId);
  const isGroup = isGroupThreadId(threadId);
  const simple = simpleDm || phoneDm;
  const lensActive = !experienceDiscussion && shouldAnalyzePeerAiLens(policyInput);
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
    peerLastReadAt,
    groupReadCursors,
  } = usePeerThreadChat(policyInput);
  const visibleMessages = useMemo(() => {
    if (!hideMarketHandshakeSeeds) {
      return messages;
    }
    return messages.filter(
      (row) =>
        row.messageType !== "system" || !isMarketHandshakeSeedMessage(row.body),
    );
  }, [hideMarketHandshakeSeeds, messages]);
  const { candidatesByMessageId } = usePeerAiLens({
    messages: visibleMessages,
    enabled: lensActive && !readOnly,
  });
  const [text, setText] = useState("");
  const [quickRepliesVisible, setQuickRepliesVisible] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const composerBusy = aiBusy || imageBusy;
  const scrollBehaviorRef = useRef<ScrollBehavior>("auto");
  const {
    handleLensSelect,
    mapPicker,
    setMapPicker,
    scheduleConfirm,
    setScheduleConfirm,
    handleScheduleSaved,
  } = useLensBubbleActions({ displayName, peerThreadId: threadId });

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
    setQuickRepliesVisible(true);
  }, [threadId]);

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
  }, [messages.length, aiBusy, messagesHydrating, threadId]);

  const showSkeleton = messagesHydrating && messages.length === 0;
  const showEmptyHint =
    !messagesHydrating && messages.length === 0 && !showSkeleton;

  useEffect(() => {
    const hasUserText = messages.some(
      (row) => row.messageType !== "system" && row.body.trim().length > 0,
    );
    if (hasUserText) {
      setQuickRepliesVisible(false);
    }
  }, [messages]);

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
  }, [simple]);

  useEffect(() => {
    resizeComposer();
  }, [text, resizeComposer]);

  const submit = useCallback(async () => {
    const body = text.trim();
    if (!body || composerBusy) {
      return;
    }
    if (readOnly) {
      if (readOnlySendHint?.trim()) {
        toast.message(readOnlySendHint);
      }
      return;
    }
    if (!canSend) {
      return;
    }
    setText("");
    resizeComposer();
    focusComposer();
    void send(body, "me").then(() => focusComposer());
  }, [text, canSend, readOnly, readOnlySendHint, composerBusy, send, focusComposer, resizeComposer]);

  const sendQuickReply = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed || !canSend || readOnly || composerBusy) {
        return;
      }
      setQuickRepliesVisible(false);
      void send(trimmed, "me").then(() => focusComposer());
    },
    [canSend, readOnly, composerBusy, send, focusComposer],
  );

  const showMarketQuickReplies =
    quickRepliesVisible && marketQuickReplies.length > 0 && !readOnly && canSend;

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

  const onLensSelect = (
    candidate: DeepLinkBubbleCandidate,
    sourceMessageId?: string,
  ) => {
    handleLensSelect(candidate, sourceMessageId);
  };

  const speakerNameFor = (author: PeerMessage["author"]) => {
    if (author === "me") {
      return "나";
    }
    if (author === "ai") {
      return "Rimvio";
    }
    return peerProfile.displayName;
  };

  const composer = (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex items-end px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2",
        experienceDiscussion ? "gap-2" : simple ? "gap-1.5" : "gap-2.5",
      )}
    >
      <input
        ref={imageInputRef}
        type="file"
        accept={PEER_CHAT_MEDIA_ACCEPT}
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
          className="mb-px flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
        >
          {imageBusy ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="size-5" strokeWidth={2} aria-hidden />
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
        placeholder={readOnly ? copy.peers.dmChat.readOnlyPlaceholder : "맥락 이야기"}
        className="max-h-28 min-h-[44px] flex-1 resize-none overflow-y-auto rounded-2xl border border-border bg-muted px-4 py-2.5 text-[15px] outline-none placeholder:text-muted-foreground"
      />
      <button
        type="button"
        disabled={!canSend || !text.trim() || composerBusy}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => void submit()}
        className="mb-px flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-30"
        aria-label="보내기"
      >
        {aiBusy ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : (
          <ArrowUp className="size-5 stroke-[2.5]" aria-hidden />
        )}
      </button>
    </form>
  );

  if (experienceDiscussion && contextTalkEventId?.trim()) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {syncError ? (
          <p className="relative z-10 px-3 py-1.5 text-center text-[11px] text-amber-700/90">
            {normalizePeerSyncError(syncError)}
          </p>
        ) : null}
        <ContextTalkRoomPanel
          eventId={contextTalkEventId.trim()}
          tripTitle={contextTalkTitle}
          policyInput={policyInput}
          messages={messages}
          speakerNameFor={speakerNameFor}
          composer={composer}
          className="min-h-0 flex-1"
        />
        <LensMapPickerSheet
          open={mapPicker.open}
          place={mapPicker.place}
          onOpenChange={(open) =>
            setMapPicker((prev) => ({ ...prev, open, place: open ? prev.place : null }))
          }
        />
        <LensScheduleConfirmSheet
          open={scheduleConfirm.open}
          draft={scheduleConfirm.draft}
          onOpenChange={(open) =>
            setScheduleConfirm((prev) => ({
              open,
              draft: open ? prev.draft : null,
            }))
          }
          onSaved={handleScheduleSaved}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        experienceDiscussion || simple ? cn("bg-background", simple && DM_CHAT.surface) : "rimvio-dm-chat-bg",
      )}
    >
      {!experienceDiscussion && !readOnly && !phoneDm && !isGroup ? (
        <PeerInviteBanner inviteUrl={inviteUrl} inviteCode={inviteCode} />
      ) : null}

      {contextTalkEventId?.trim() && !experienceDiscussion ? (
        <PeerContextMiniMap
          eventId={contextTalkEventId}
          title={contextTalkTitle}
          className="mt-2"
        />
      ) : null}

      {syncError ? (
        <p className="px-3 py-1.5 text-center text-[11px] text-amber-200/90">
          {normalizePeerSyncError(syncError)}
        </p>
      ) : null}

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          experienceDiscussion ? "px-0 py-0" : simple ? DM_CHAT.listPad : "px-4 py-4",
        )}
      >
        {showSkeleton ? (
          <DmChatMessageSkeleton />
        ) : showEmptyHint ? (
          <p
            className={cn(
              "text-center text-muted-foreground",
              experienceDiscussion || simple ? "py-8 text-sm" : "py-16 text-base",
            )}
          >
            {experienceDiscussion
              ? "이 경험에 대한 이야기를 남겨 보세요"
              : simple
                ? copy.peers.dmChat.messagePlaceholder
                : `${displayName}와 대화해요`}
          </p>
        ) : experienceDiscussion ? (
          <ul
            className={cn(
              "divide-y divide-border rounded-xl border border-border bg-background mx-3 my-3",
            )}
          >
            {messages
              .filter((row) => row.author !== "ai" && row.body.trim().length > 0)
              .map((message) => (
                <ExperienceDiscussionMessage
                  key={message.id}
                  message={message}
                  speakerName={speakerNameFor(message.author)}
                />
              ))}
          </ul>
        ) : (
          <ul
            className={cn(
              "flex flex-col",
              simple ? DM_CHAT.listGap : "gap-3",
            )}
          >
            {visibleMessages.map((message, index) => (
              <Fragment key={message.id}>
                {simple && shouldShowPeerDateDivider(visibleMessages, index) ? (
                  <PeerChatDateDivider sentAt={message.sentAt} />
                ) : null}
                <PeerChatBubble
                  message={message}
                  simple={simple}
                  showTime={!simple && shouldShowPeerMessageTime(visibleMessages, index)}
                  showPeerAvatar={
                    simple
                      ? shouldShowPeerAvatarCluster(visibleMessages, index)
                      : shouldShowPeerMessageTime(visibleMessages, index)
                  }
                  showPeerProfileHeader={false}
                  peerProfile={peerProfile}
                  lensCandidates={candidatesByMessageId[message.id] ?? []}
                  onLensSelect={(candidate) => onLensSelect(candidate, message.id)}
                  lensDisabled={aiBusy}
                  showSentCheck={
                    phoneDm &&
                    shouldShowPeerSentCheck(visibleMessages, index, peerLastReadAt)
                  }
                  groupReadCount={
                    isGroup
                      ? groupReadCountForMessage(visibleMessages, index, groupReadCursors)
                      : 0
                  }
                />
              </Fragment>
            ))}
            {aiBusy ? (
              <li className="flex justify-end">
                <span
                  className={cn(
                    "rounded-full bg-muted text-muted-foreground",
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

      {simple ? (
        <>
          {showMarketQuickReplies ? (
            <MarketChatQuickReplyPills
              replies={marketQuickReplies}
              disabled={composerBusy}
              onSelect={(reply) => void sendQuickReply(reply)}
              className="bg-background"
            />
          ) : null}
          <PeerDmKakaoComposer
          text={text}
          onTextChange={setText}
          onSubmit={submit}
          onFormSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
          imageInputRef={imageInputRef}
          onImageSelected={(file) => void handleImageFile(file)}
          canSend={canSend}
          readOnly={readOnly}
          composerBusy={composerBusy}
          canSendImage={canSendImage}
          imageBusy={imageBusy}
          aiBusy={aiBusy}
          placeholder={composerPlaceholder}
        />
        </>
      ) : (
      <div
        className={cn(
          "shrink-0 border-t",
          "rimvio-dm-composer px-3 pb-3 pt-2",
        )}
      >
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2.5"
        >
          <input
            ref={imageInputRef}
            type="file"
            accept={PEER_CHAT_MEDIA_ACCEPT}
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
              className="mb-px flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
            >
              {imageBusy ? (
                <Loader2
                  className="size-5 animate-spin"
                  aria-hidden
                />
              ) : (
                <ImagePlus
                  className="size-6"
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
            className="max-h-32 min-h-[48px] flex-1 resize-none overflow-y-auto rounded-xl bg-rimvio-surface-muted px-4 py-3 text-base outline-none"
          />
          <button
            type="button"
            disabled={!canSend || !text.trim() || composerBusy}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void submit()}
            className="rimvio-dm-send-btn mb-px flex size-11 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-30"
            aria-label="보내기"
          >
            {aiBusy ? (
              <Loader2
                className="size-5 animate-spin"
                aria-hidden
              />
            ) : (
              <ArrowUp
                className="size-6 stroke-[2.5]"
                aria-hidden
              />
            )}
          </button>
        </form>
      </div>
      )}

      <LensMapPickerSheet
        open={mapPicker.open}
        place={mapPicker.place}
        onOpenChange={(open) =>
          setMapPicker((prev) => ({ ...prev, open, place: open ? prev.place : null }))
        }
      />
      <LensScheduleConfirmSheet
        open={scheduleConfirm.open}
        draft={scheduleConfirm.draft}
        onOpenChange={(open) =>
          setScheduleConfirm((prev) => ({
            open,
            draft: open ? prev.draft : null,
          }))
        }
        onSaved={handleScheduleSaved}
      />
    </div>
  );
}
