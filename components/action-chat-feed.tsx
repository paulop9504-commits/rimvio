"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, FolderGit2, Settings2 } from "lucide-react";
import {
  ActionDatePickerSheet,
} from "@/components/action-chat/action-date-picker-sheet";
import { OcrReviewDatePickerSheet } from "@/components/action-chat/ocr-review-date-picker-sheet";
import { ResourcePoolSheet } from "@/components/action-chat/resource-pool-sheet";
import {
  GoogleSheetsEmbedSheet,
  type GoogleSheetsEmbedTarget,
} from "@/components/action-chat/google-sheets-embed-sheet";
import { subscribeOpenGoogleSheet } from "@/lib/integrations/google-sheets-open-event";
import { ActiveActionsSheet } from "@/components/action-chat/active-actions-sheet";
import { CalendarBoard } from "@/components/action-chat/calendar-board";
import { ActionChatInputBar } from "@/components/action-chat/input-bar";
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
import { GlangoLogo } from "@/components/glango-logo";
import { OnboardingMagicPanel } from "@/components/onboarding-magic-panel";
import { useActionChat } from "@/hooks/use-action-chat";
import { usePredictiveDock } from "@/hooks/use-predictive-dock";
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
import { shouldShowColdStartMagic } from "@/lib/onboarding/cold-start-magic";
import type { LocateActionResult } from "@/lib/locate/types";
import type { ContextRemoteState } from "@/lib/remote/resolve-context-remote";
import type { LinkRow } from "@/types/database";
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
    resumeConfirmInterrupt,
    dismissConfirmForInterrupt,
    handleWittyAction,
    cancelScheduledAction,
    triggerScheduledActionNow,
    executeTimeChoice,
    handleStudyAuxAction,
    togglePackingItem,
    startFreshConversation,
    completeInlineTimer,
    confirmInlineFocus,
    cancelInlineFocus,
    completeInlineFocus,
    handleFocusHeldInAppAction,
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
  const threadlineNeedsTap =
    threadlineHeaderStatus(threadlineCards) === "needs_one_tap";
  const { visible: dockActions } = usePredictiveDock({
    messages,
    schedule: masterContext.existingSchedule,
    referenceDate: masterContext.currentDate,
  });
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
  const [coldStartVisible, setColdStartVisible] = useState(false);
  const prevMessageCountRef = useRef(messages.length);

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
    setColdStartVisible(
      shouldShowColdStartMagic({
        linkCount: links.length,
        userMessageCount,
      })
    );
  }, [links.length, userMessageCount]);

  useEffect(() => {
    const node = threadRef.current;
    if (!node) {
      return;
    }
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages.length, activeIndex, activeLink?.id]);

  return (
    <>
      <div
        data-action-chat-root
        className={cn(
          "action-shell flex h-full min-h-0 flex-1 flex-col overflow-hidden",
          className
        )}
      >
        <header className="shrink-0 border-b border-white/10 bg-glango-base/80 px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <GlangoLogo size="sm" className="h-7" appearance="white" />
            <div className="flex items-center gap-1">
              {messages.length > 0 || activeLink ? (
                <button
                  type="button"
                  onClick={handleStartFreshConversation}
                  className="rounded-full border border-white/85 bg-transparent px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/[0.06]"
                >
                  새 대화
                </button>
              ) : null}
              <button
                type="button"
                aria-label="리소스풀"
                onClick={() => setResourcePoolOpen(true)}
                className="relative flex size-9 items-center justify-center rounded-full bg-transparent text-white transition-opacity hover:opacity-80 active:scale-95"
              >
                <FolderGit2 className="size-5" strokeWidth={2.1} />
                {resourcePoolCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex size-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-glango-base px-0.5 text-[10px] font-extrabold tabular-nums leading-none text-[#D8B4FE] shadow-[0_0_8px_rgba(191,90,242,0.35)]">
                    {resourcePoolCount > 9 ? "9+" : resourcePoolCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                aria-label="캘린더"
                onClick={() => setActiveActionsOpen(true)}
                className="relative flex size-9 items-center justify-center rounded-full bg-transparent text-white transition-opacity hover:opacity-80 active:scale-95"
              >
                <Calendar className="size-5" strokeWidth={2.1} />
                {badgeCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex size-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-glango-base px-0.5 text-[10px] font-extrabold tabular-nums leading-none text-glango-neon-amber shadow-[0_0_8px_rgba(255,214,10,0.35)]">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                ) : null}
              </button>
              <Link
                href="/welcome"
                aria-label="설정"
                className="flex size-9 items-center justify-center rounded-full bg-transparent text-white transition-opacity hover:opacity-80 active:scale-95"
              >
                <Settings2 className="size-5" strokeWidth={2.1} />
              </Link>
            </div>
          </div>
        </header>

        {activeLink ? (
          <div className="max-h-[min(40dvh,220px)] shrink-0 overflow-hidden border-b border-white/[0.06] bg-glango-surface-muted">
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
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div
            ref={threadRef}
            className="relative z-[2] min-h-0 flex-1 overflow-y-auto overscroll-y-contain glango-feed-scroll-inset [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {!activeLink && messages.length === 0 && !coldStartVisible ? (
              <ContextNowStrip
                nextAction={nextAction}
                onOpenCalendar={() => setActiveActionsOpen(true)}
                onSuggest={(text) => void sendMessage(text)}
              />
            ) : null}

            {coldStartVisible ? (
              <OnboardingMagicPanel
                onSendSeed={(text) => void sendMessage(text)}
                onDismiss={() => setColdStartVisible(false)}
              />
            ) : null}

            {prepSurface.visible ? (
              <div className="border-b border-black/[0.04] bg-glango-surface/80 px-3 py-4">
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
                />
              </div>
            </ExecutionTimeline>
          </div>

          <ActionChatInputBar
            placeholder={
              threadlineNeedsTap ? "오늘에 추가…" : "무엇을 도와드릴까요?"
            }
            sending={sending}
            disabled={sending}
            onOpenCapture={onOpenCapture}
            onOpenLinkPaste={onOpenLinkPaste}
            onQuickCapture={onQuickCapture}
            onSendComposer={(payload) => {
              if (sendComposerPayload(payload)) {
                return;
              }
              void sendMessage(payload.text, {
                attachments: payload.attachments,
                chatAxis: payload.chatAxis,
              });
            }}
            className="glango-feed-composer-dock shrink-0 lg:relative lg:z-[2]"
          />
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
