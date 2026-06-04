"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, FolderGit2, Settings2 } from "lucide-react";
import {
  ActionDatePickerSheet,
} from "@/components/action-chat/action-date-picker-sheet";
import { OcrReviewDatePickerSheet } from "@/components/action-chat/ocr-review-date-picker-sheet";
import { ResourcePoolSheet } from "@/components/action-chat/resource-pool-sheet";
import { RelationshipFeedFolder } from "@/components/feed/relationship-feed-folder";
import { RimvioManualFeedBanner } from "@/components/rimvio-manual-feed-banner";
import {
  GoogleSheetsEmbedSheet,
  type GoogleSheetsEmbedTarget,
} from "@/components/action-chat/google-sheets-embed-sheet";
import { subscribeOpenGoogleSheet } from "@/lib/integrations/google-sheets-open-event";
import { ActiveActionsSheet } from "@/components/action-chat/active-actions-sheet";
import { CalendarBoard } from "@/components/action-chat/calendar-board";
import { ActionChatInputBar } from "@/components/action-chat/input-bar";
import { isFeedPeerTalkSendActive } from "@/lib/action-chat/feed-peer-talk/is-feed-peer-talk-send-active";
import {
  ChatAmbientFocusProvider,
  ChatAmbientShell,
} from "@/components/action-chat/chat-ambient-focus";
import { ContextNowStrip } from "@/components/action-chat/context-now-strip";
import { ActionChatLinkPanel } from "@/components/action-chat/link-panel";
import { ActionChatMessageList } from "@/components/action-chat/message-list";
import { ExecutionTimeline } from "@/components/threadline/execution-timeline";
import { TodayThread } from "@/components/threadline/today-thread";
import { threadlineHeaderStatus } from "@/lib/threadline";
import { RimvioLogo } from "@/components/rimvio-logo";
import { RimvioProductContextStrip } from "@/components/rimvio-product-context-strip";
import { OnboardingMagicPanel } from "@/components/onboarding-magic-panel";
import { useActionChat } from "@/hooks/use-action-chat";
import { usePredictiveDock } from "@/hooks/use-predictive-dock";
import { useSurfaceEngine } from "@/hooks/use-surface-engine";
import { useCapabilityDispatch } from "@/hooks/use-capability-dispatch";
import { SurfaceFeedStrip } from "@/components/surface/surface-feed-strip";
import { markOpportunityConsumed } from "@/lib/predictive-dock/action-opportunity-session";
import { recordDockActionUsage } from "@/lib/action-registry/record-dock-usage";
import { wireEventCompleted } from "@/lib/events/event-lifecycle-hooks";
import { normalizeAnchorId } from "@/lib/events/normalize-anchor-id";
import { executeDockActionWire } from "@/lib/action-os/execute-dock-action-wire";
import { readClientMasterOrchestratorContext } from "@/lib/action-chat/client-master-context";
import { useLinkReminderMap } from "@/hooks/use-link-reminders";
import { useActionCalendar } from "@/hooks/use-action-calendar";
import { useResourcePool } from "@/hooks/use-resource-pool";
import {
  buildFireAtFromDateTime,
  demoteLinkFromActionStream,
  promoteLinkToActionStream,
} from "@/lib/dual-mode/link-lifecycle";
import { useLinkContextChain } from "@/hooks/use-link-context-chain";
import { useCopy, useAppLocale } from "@/hooks/use-copy";
import {
  feedThreadScrollBehavior,
  isThreadNearBottom,
  scrollThreadToBottom,
} from "@/lib/feed/feed-thread-scroll";
import { shouldShowColdStartMagic } from "@/lib/onboarding/cold-start-magic";
import type { LocateActionResult } from "@/lib/locate/types";
import type { ContextRemoteState } from "@/lib/remote/resolve-context-remote";
import type { LinkRow } from "@/types/database";
import { ActionDockWhyLine } from "@/components/action-dock/action-dock-why-line";
import { PredictiveActionDock } from "@/components/action-chat/predictive-action-dock";
import { buildUserExplainabilityKoLine } from "@/lib/event-os/ui-binding/build-user-explainability-ko";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ActionChatFeedProps = {
  links: LinkRow[];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  contextRemote?: ContextRemoteState | null;
  locateResult?: LocateActionResult | null;
  locateLoading?: boolean;
  onOpenLinkPaste: () => void;
  onOpenCapture?: () => void;
  onQuickCapture?: (file: File) => void;
  className?: string;
};

export function ActionChatFeed({
  links,
  activeIndex,
  onSelectIndex,
  contextRemote = null,
  locateResult = null,
  locateLoading = false,
  onOpenLinkPaste,
  onOpenCapture,
  onQuickCapture,
  className,
}: ActionChatFeedProps) {
  const copy = useCopy();
  const locale = useAppLocale();
  const activeLink = activeIndex >= 0 ? links[activeIndex] ?? null : null;
  const {
    chainedLinks,
    selectLink,
    clearChain,
  } = useLinkContextChain(links);
  const threadRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    sending,
    sendMessage,
    sendComposerPayload,
    submitHitRunFeedback,
    revealMessageActions,
    revealAlternateMessageActions,
    datePickerRequest,
    threadlineCards,
    deferredCards,
    handleThreadlineResolveChip,
    restoreThreadlineDeferred,
    confirmDatePicker,
    confirmOcrReviewDates,
    dismissDatePicker,
    confirmPlace,
    correctPlace,
    selectArea,
    chatScopeId,
    resumeConfirmInterrupt,
    dismissConfirmForInterrupt,
    handleWittyAction,
    cancelScheduledAction,
    triggerScheduledActionNow,
    executeTimeChoice,
    handleStudyAuxAction,
    togglePackingItem,
    startFreshConversation,
    feedPeerTalkSession,
    startFeedPeerTalk,
    sendFeedPeerTalk,
    completeInlineTimer,
    confirmInlineFocus,
    cancelInlineFocus,
    completeInlineFocus,
    handleFocusHeldInAppAction,
    eventOsProofRender,
    eventOsLastProof,
  } = useActionChat(activeLink, chainedLinks);
  const reminderMap = useLinkReminderMap();
  const linkIds = useMemo(() => links.map((link) => link.id), [links]);
  const {
    badgeCount,
    prepSurface,
    nextAction,
    ...calendarForSheet
  } = useActionCalendar({
    messages,
    linkIds,
    refreshKey: reminderMap,
  });
  const masterContext = useMemo(() => readClientMasterOrchestratorContext(), [messages]);
  const { feed: feedSurfaces } = useSurfaceEngine({
    dateKey: masterContext.currentDate,
    context: { now: new Date() },
  });
  const { dispatch: dispatchCapability } = useCapabilityDispatch({
    sendPrompt: (text) => void sendMessage(text),
  });
  const threadlineNeedsTap =
    threadlineHeaderStatus(threadlineCards) === "needs_one_tap";
  const { visible: dockActions } = usePredictiveDock({
    messages,
    schedule: masterContext.existingSchedule,
    referenceDate: masterContext.currentDate,
    chatScopeId,
  });

  const causalWhyLine = useMemo(() => {
    if (!eventOsProofRender || !eventOsLastProof) {
      return null;
    }
    return buildUserExplainabilityKoLine(
      eventOsLastProof,
      eventOsProofRender.explainability,
    );
  }, [eventOsLastProof, eventOsProofRender]);
  const actionContextByMessageId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const message of messages) {
      if (message.role === "assistant" && message.text.trim()) {
        map[message.id] = message.text.trim();
      }
    }
    return map;
  }, [messages]);
  const [activeActionsOpen, setActiveActionsOpen] = useState(false);
  const [resourcePoolOpen, setResourcePoolOpen] = useState(false);
  const [googleSheetOpen, setGoogleSheetOpen] = useState(false);
  const [googleSheetTarget, setGoogleSheetTarget] = useState<GoogleSheetsEmbedTarget | null>(
    null,
  );

  const openGoogleSheet = useCallback((url: string, title?: string) => {
    setGoogleSheetTarget({ url, title });
    setGoogleSheetOpen(true);
    setResourcePoolOpen(false);
  }, []);

  useEffect(() => {
    return subscribeOpenGoogleSheet(({ url, title }) => {
      openGoogleSheet(url, title);
    });
  }, [openGoogleSheet]);
  const { totalCount: resourcePoolCount } = useResourcePool();
  const [schedulingLink, setSchedulingLink] = useState<LinkRow | null>(null);
  const userMessageCount = messages.filter((message) => message.role === "user").length;
  const showColdStartMagic = useMemo(
    () =>
      shouldShowColdStartMagic({
        linkCount: links.length,
        userMessageCount,
      }),
    [links.length, userMessageCount],
  );
  const [coldStartDismissed, setColdStartDismissed] = useState(false);
  const coldStartVisible = showColdStartMagic && !coldStartDismissed;
  const prevMessageCountRef = useRef(messages.length);
  const threadScrollStateRef = useRef({
    messageLen: messages.length,
    activeLinkId: activeLink?.id ?? null,
  });

  const handleStartFreshConversation = useCallback(() => {
    onSelectIndex(-1);
    clearChain();
    startFreshConversation();
  }, [clearChain, onSelectIndex, startFreshConversation]);

  const openLinkById = (linkId: string) => {
    const index = links.findIndex((link) => link.id === linkId);
    if (index >= 0) {
      selectLink(linkId);
      onSelectIndex(index);
    }
  };

  const handlePromoteLink = useCallback(
    async (link: LinkRow, date: string, time: string) => {
      const fireAt = buildFireAtFromDateTime(date, time);
      try {
        await promoteLinkToActionStream(link, fireAt);
        toast("액션 스트림에 올렸어요", {
          description: `${date} ${time} · ${link.title}`,
        });
        setSchedulingLink(null);
        setActiveActionsOpen(true);
      } catch (error) {
        const message =
          error instanceof Error && error.message === "fire_at_past"
            ? "이미 지난 시간이에요. 미래 시간을 골라 주세요."
            : "일정을 저장하지 못했어요. 다시 시도해 주세요.";
        toast(message);
      }
    },
    []
  );

  useEffect(() => {
    if (prevMessageCountRef.current > 0 && messages.length === 0) {
      onSelectIndex(-1);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, onSelectIndex]);

  useEffect(() => {
    const node = threadRef.current;
    if (!node || messages.length === 0) {
      return;
    }

    const prev = threadScrollStateRef.current;
    const messageGrew = messages.length > prev.messageLen;
    const linkChanged = (activeLink?.id ?? null) !== prev.activeLinkId;
    threadScrollStateRef.current = {
      messageLen: messages.length,
      activeLinkId: activeLink?.id ?? null,
    };

    if (!messageGrew && !linkChanged) {
      return;
    }
    if (messageGrew && !isThreadNearBottom(node)) {
      return;
    }

    scrollThreadToBottom(node, feedThreadScrollBehavior());
  }, [messages.length, activeIndex, activeLink?.id]);

  const feedPeerTalkSendActive = isFeedPeerTalkSendActive(
    feedPeerTalkSession,
    messages,
  );

  return (
    <>
      <div
        data-action-chat-root
        className={cn(
          "action-shell flex h-full min-h-0 flex-1 flex-col overflow-hidden",
          className
        )}
      >
        <header className="shrink-0 border-b border-white/10 bg-rimvio-base/80 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-5">
          <div className="flex min-h-9 items-center justify-between gap-2">
            <RimvioLogo size="sm" className="h-7 shrink-0" appearance="white" />
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              {messages.length > 0 || activeLink ? (
                <button
                  type="button"
                  onClick={handleStartFreshConversation}
                  className="hidden rounded-full border border-white/85 bg-transparent px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/[0.06] min-[400px]:inline sm:px-3 sm:text-[12px]"
                >
                  새 대화
                </button>
              ) : null}
              <RelationshipFeedFolder />
              <button
                type="button"
                aria-label="리소스풀"
                onClick={() => setResourcePoolOpen(true)}
                className="relative flex size-8 items-center justify-center rounded-full bg-transparent text-white transition-opacity hover:opacity-80 active:scale-95 sm:size-9"
              >
                <FolderGit2 className="size-[1.15rem] sm:size-5" strokeWidth={2.1} />
                <span
                  className={cn(
                    "absolute -right-0.5 -top-0.5 flex size-4 min-w-4 items-center justify-center rounded-full bg-rimvio-base px-0.5 text-[9px] font-extrabold tabular-nums leading-none text-[#D8B4FE] shadow-[0_0_8px_rgba(191,90,242,0.35)] sm:-right-1 sm:-top-1 sm:size-[1.125rem] sm:min-w-[1.125rem] sm:text-[10px]",
                    resourcePoolCount <= 0 && "pointer-events-none opacity-0",
                  )}
                  aria-hidden={resourcePoolCount <= 0}
                >
                  {resourcePoolCount > 9 ? "9+" : resourcePoolCount || "1"}
                </span>
              </button>
              <button
                type="button"
                aria-label="캘린더"
                onClick={() => setActiveActionsOpen(true)}
                className="relative flex size-8 items-center justify-center rounded-full bg-transparent text-white transition-opacity hover:opacity-80 active:scale-95 sm:size-9"
              >
                <Calendar className="size-[1.15rem] sm:size-5" strokeWidth={2.1} />
                <span
                  className={cn(
                    "absolute -right-0.5 -top-0.5 flex size-4 min-w-4 items-center justify-center rounded-full bg-rimvio-base px-0.5 text-[9px] font-extrabold tabular-nums leading-none text-rimvio-neon-amber shadow-[0_0_8px_rgba(255,214,10,0.35)] sm:-right-1 sm:-top-1 sm:size-[1.125rem] sm:min-w-[1.125rem] sm:text-[10px]",
                    badgeCount <= 0 && "pointer-events-none opacity-0",
                  )}
                  aria-hidden={badgeCount <= 0}
                >
                  {badgeCount > 9 ? "9+" : badgeCount || "1"}
                </span>
              </button>
              <Link
                href="/welcome"
                aria-label="설정"
                className="flex size-8 items-center justify-center rounded-full bg-transparent text-white transition-opacity hover:opacity-80 active:scale-95 sm:size-9"
              >
                <Settings2 className="size-[1.15rem] sm:size-5" strokeWidth={2.1} />
              </Link>
            </div>
          </div>
          <RimvioProductContextStrip
            variant="feed"
            layout="header"
            className="mt-1.5 border-t border-white/[0.06] pt-1.5"
          />
        </header>

        <RimvioManualFeedBanner className="mx-4 mb-2 mt-1 shrink-0" />

        {activeLink ? (
          <div className="max-h-[min(40dvh,220px)] shrink-0 overflow-hidden border-b border-white/[0.06] bg-rimvio-surface-muted">
            <p className="px-5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-white/45">
              현재 맥락
            </p>
            <ActionChatLinkPanel
              key={activeLink.id}
              link={activeLink}
              isActive
              contextRemote={activeIndex === 0 ? contextRemote : null}
              locateResult={activeIndex === 0 ? locateResult : null}
              locateLoading={activeIndex === 0 ? locateLoading : false}
            />
          </div>
        ) : null}

        <ChatAmbientFocusProvider>
        <ChatAmbientShell
          aria-label="채팅"
          suppressDecor={feedPeerTalkSendActive}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div
            ref={threadRef}
            className="relative z-[1] min-h-0 flex-1 overflow-y-auto overscroll-y-contain rimvio-feed-scroll-inset touch-pan-y [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="feed-hero-slot shrink-0">
              {coldStartVisible ? (
                <div className="flex justify-center px-3 pt-2">
                  <OnboardingMagicPanel
                    onSendSeed={(text) => void sendMessage(text)}
                    onDismiss={() => setColdStartDismissed(true)}
                  />
                </div>
              ) : !activeLink && messages.length === 0 ? (
                <ContextNowStrip
                  nextAction={nextAction}
                  onOpenCalendar={() => setActiveActionsOpen(true)}
                  onSuggest={(text) => void sendMessage(text)}
                />
              ) : null}
            </div>

            {feedSurfaces.length > 0 ? (
              <SurfaceFeedStrip
                surfaces={feedSurfaces}
                onDispatchCapability={(surface, _actionId, capabilityId) => {
                  dispatchCapability({
                    capabilityId,
                    inputs: {
                      title: surface.title,
                      destination: surface.resources.find((r) => r.kind === "location")?.label,
                      place: surface.resources.find((r) => r.kind === "location")?.label,
                    },
                  });
                }}
              />
            ) : null}

            {prepSurface.visible ? (
              <div className="border-b border-black/[0.04] bg-rimvio-surface/80 px-3 py-4">
                <CalendarBoard
                  variant="compact"
                  overlayRows={prepSurface.rows}
                  compactTitle={prepSurface.title}
                  onExpand={() => setActiveActionsOpen(true)}
                  onSpawnPrompt={(uri) => void sendMessage(uri)}
                />
              </div>
            ) : null}

            {messages.length === 0 && !coldStartVisible && activeLink ? (
              <div className="px-5 py-4">
                <p className="text-[14px] leading-relaxed text-white/55">
                  {copy.action.emptyNoSelection}
                </p>
              </div>
            ) : null}

            <ExecutionTimeline>
              <TodayThread
                cards={threadlineCards}
                deferredCards={deferredCards}
                onResolveChip={handleThreadlineResolveChip}
                onRestoreDeferred={restoreThreadlineDeferred}
              />

              <div data-timeline-segment="chat" className="pt-1">
                <ActionChatMessageList
              messages={messages}
              activeLink={activeLink}
              locale={locale}
              copy={copy}
              onRevealActions={revealMessageActions}
              onRevealAlternateActions={revealAlternateMessageActions}
              onConfirmPlace={confirmPlace}
              onCorrectPlace={correctPlace}
              onSelectArea={selectArea}
              chatScopeId={chatScopeId}
              onWittyAction={handleWittyAction}
              onResumeConfirmInterrupt={resumeConfirmInterrupt}
              onCancelConfirmInterrupt={(messageId) => {
                const followUp = dismissConfirmForInterrupt(messageId);
                if (followUp) {
                  void sendMessage(followUp);
                }
              }}
              onInlineTimerComplete={completeInlineTimer}
              onInlineFocusConfirm={confirmInlineFocus}
              onInlineFocusCancel={cancelInlineFocus}
              onInlineFocusComplete={completeInlineFocus}
              calendarOverlayRows={calendarForSheet.overlayRows}
              calendarContextByMessageId={actionContextByMessageId}
              onOpenCalendarSheet={() => setActiveActionsOpen(true)}
              onCalendarSpawnPrompt={(uri) => void sendMessage(uri)}
              onNavigateSpawnPrompt={(uri) => void sendMessage(uri)}
              onScheduleOrganizePrompt={(prompt) => void sendMessage(prompt)}
              onTransferSpawnPrompt={(uri) => void sendMessage(uri)}
              onFocusHeldInAppAction={handleFocusHeldInAppAction}
              onOpenCapture={onOpenCapture}
              onFeedPeerTalkStart={(contact) => {
                void startFeedPeerTalk(contact);
              }}
                />
              </div>
            </ExecutionTimeline>
          </div>

          {dockActions.length > 0 ? (
            <div className="shrink-0 px-3 pb-1">
              <PredictiveActionDock
                actions={dockActions}
                onSelect={(action) => {
                  markOpportunityConsumed(action.id);
                  recordDockActionUsage({ action });
                  window.dispatchEvent(
                    new CustomEvent("rimvio:opportunity-consumed"),
                  );
                  void sendMessage(action.prompt);
                }}
              />
            </div>
          ) : null}

          {causalWhyLine ? (
            <div className="shrink-0 px-5 pb-1">
              <ActionDockWhyLine line={causalWhyLine} variant="overlay" />
            </div>
          ) : null}

          <div
            className="rimvio-feed-composer-dock pointer-events-auto shrink-0 touch-manipulation lg:relative lg:z-[2]"
            data-feed-composer-dock
          >
            <ActionChatInputBar
              placeholder={
                feedPeerTalkSendActive && feedPeerTalkSession
                  ? `${feedPeerTalkSession.displayName}에게 메시지`
                  : threadlineNeedsTap
                    ? "오늘에 추가…"
                    : "무엇을 도와드릴까요?"
              }
              sending={sending}
              disabled={sending}
              onOpenCapture={onOpenCapture}
              onOpenLinkPaste={onOpenLinkPaste}
              onQuickCapture={onQuickCapture}
              onPeerTalkPick={(contact) => {
                void startFeedPeerTalk(contact);
              }}
              onSendComposer={async (payload) => {
                const hasAttachments = (payload.attachments?.length ?? 0) > 0;
                if (
                  feedPeerTalkSendActive &&
                  !hasAttachments &&
                  payload.text.trim() &&
                  !payload.text.trim().startsWith("@")
                ) {
                  const sent = await sendFeedPeerTalk(payload.text);
                  return sent;
                }
                if (sendComposerPayload(payload)) {
                  return true;
                }
                void sendMessage(payload.text, {
                  attachments: payload.attachments,
                  chatAxis: payload.chatAxis,
                });
                return true;
              }}
            />
          </div>
        </ChatAmbientShell>
        </ChatAmbientFocusProvider>
      </div>

      <OcrReviewDatePickerSheet
        open={datePickerRequest?.type === "OCR_REVIEW_DATE_PICKER"}
        onOpenChange={(open) => {
          if (!open) {
            dismissDatePicker();
          }
        }}
        request={
          datePickerRequest?.type === "OCR_REVIEW_DATE_PICKER"
            ? datePickerRequest
            : null
        }
        onConfirm={(patches) => void confirmOcrReviewDates(patches)}
      />

      <ActionDatePickerSheet
        open={datePickerRequest?.type === "DATE_PICKER"}
        onOpenChange={(open) => {
          if (!open) {
            dismissDatePicker();
          }
        }}
        draftTask={
          datePickerRequest?.type === "DATE_PICKER"
            ? (datePickerRequest.draft_task ?? "일정")
            : "일정"
        }
        onConfirm={(value) => void confirmDatePicker(value)}
      />

      <ResourcePoolSheet
        open={resourcePoolOpen}
        onOpenChange={setResourcePoolOpen}
        links={links}
        onOpenLink={openLinkById}
        onOpenGoogleSheet={openGoogleSheet}
        onOpenCapture={onOpenCapture}
      />

      <GoogleSheetsEmbedSheet
        open={googleSheetOpen}
        onOpenChange={setGoogleSheetOpen}
        target={googleSheetTarget}
      />

      <ActiveActionsSheet
        open={activeActionsOpen}
        onOpenChange={setActiveActionsOpen}
        calendar={calendarForSheet}
        contextByMessageId={actionContextByMessageId}
        onCancelScheduled={cancelScheduledAction}
        onFireScheduledNow={triggerScheduledActionNow}
        onScrollToMessage={(messageId) => {
          const node = threadRef.current?.querySelector(
            `[data-message-id="${messageId}"]`
          );
          node?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
        onCancelLinkReminder={demoteLinkFromActionStream}
        onOpenLink={openLinkById}
        onAddSchedule={() => {
          threadRef.current
            ?.closest("[data-action-chat-root]")
            ?.querySelector("textarea")
            ?.focus();
          toast.message("채팅에서 일정을 말해 보세요");
        }}
      />

      <ActionDatePickerSheet
        open={Boolean(schedulingLink)}
        onOpenChange={(open) => {
          if (!open) {
            setSchedulingLink(null);
          }
        }}
        draftTask={schedulingLink?.title ?? "링크 확인"}
        onConfirm={(value) => {
          if (!schedulingLink) {
            return;
          }
          void handlePromoteLink(schedulingLink, value.date, value.time);
        }}
      />
    </>
  );
}
