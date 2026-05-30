"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Settings2 } from "lucide-react";
import { ChatWorkspaceChrome } from "@/components/action-chat/chat-workspace-chrome";
import { ActionChatContextTabs } from "@/components/action-chat/context-tabs";
import {
  ActionDatePickerSheet,
} from "@/components/action-chat/action-date-picker-sheet";
import { ActiveActionsSheet } from "@/components/action-chat/active-actions-sheet";
import { ResourcePoolSheet } from "@/components/action-chat/resource-pool-sheet";
import {
  FixedContainerBar,
  type FixedContainerSlot,
} from "@/components/action-chat/fixed-container-bar";
import { ActionChatInputBar } from "@/components/action-chat/input-bar";
import { ActionChatLinkPanel } from "@/components/action-chat/link-panel";
import { ActionChatMessageList } from "@/components/action-chat/message-list";
import { GlangoLogo } from "@/components/glango-logo";
import { OnboardingMagicPanel } from "@/components/onboarding-magic-panel";
import { useActionChat } from "@/hooks/use-action-chat";
import { useLinkReminderMap } from "@/hooks/use-link-reminders";
import { useResourcePool } from "@/hooks/use-resource-pool";
import { collectActionStream } from "@/lib/action-chat/active-actions-registry";
import {
  buildFireAtFromDateTime,
  demoteLinkFromActionStream,
  promoteLinkToActionStream,
  saveLinkToResourcePool,
} from "@/lib/dual-mode/link-lifecycle";
import {
  FIXED_CALENDAR_CONTAINER_ID,
  FIXED_DATA_CONTAINER_ID,
} from "@/lib/knowledge/knowledge-entity-types";
import { useLinkContextChain } from "@/hooks/use-link-context-chain";
import { useContainerChain } from "@/hooks/use-container-chain";
import { ContainerChainStrip } from "@/components/action-chat/container-chain-strip";
import { useCopy, useAppLocale } from "@/hooks/use-copy";
import { getDisplayTitleForLink } from "@/lib/feed/sanitize-link-title";
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
  const activeLink = links[activeIndex] ?? null;
  const {
    chainedLinks,
    hybridLabel: linkHybridLabel,
    isHybrid: isLinkHybrid,
    snapTo,
    selectLink,
    removeFromChain,
    clearChain,
  } = useLinkContextChain(links);
  const { hybridLabel: containerHybridLabel, isHybrid: isContainerHybrid } =
    useContainerChain();
  const hybridLabel = isContainerHybrid
    ? containerHybridLabel
    : isLinkHybrid
      ? linkHybridLabel
      : "";
  const isHybrid = isContainerHybrid || isLinkHybrid;
  const chainedLinkIds = new Set(chainedLinks.map((link) => link.id));
  const threadRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    sending,
    sendMessage,
    revealMessageActions,
    revealAlternateMessageActions,
    datePickerRequest,
    confirmDatePicker,
    dismissDatePicker,
    confirmPlace,
    correctPlace,
    resumeConfirmInterrupt,
    dismissConfirmForInterrupt,
    handleWittyAction,
    cancelScheduledAction,
    triggerScheduledActionNow,
  } = useActionChat(activeLink, chainedLinks);
  const reminderMap = useLinkReminderMap();
  const linkIds = useMemo(() => links.map((link) => link.id), [links]);
  const actionStream = useMemo(
    () => collectActionStream(messages, { linkIds }),
    [messages, linkIds, reminderMap]
  );
  const scheduledLinkIds = new Set(reminderMap.keys());
  const { items: poolItems, refresh: refreshResourcePool } = useResourcePool();
  const [activeActionsOpen, setActiveActionsOpen] = useState(false);
  const [resourcePoolOpen, setResourcePoolOpen] = useState(false);
  const [schedulingLink, setSchedulingLink] = useState<LinkRow | null>(null);
  const [containerHoverSlot, setContainerHoverSlot] = useState<FixedContainerSlot | null>(
    null
  );
  const [activeContainerSlot, setActiveContainerSlot] = useState<FixedContainerSlot | null>(
    null
  );
  const userMessageCount = messages.filter((message) => message.role === "user").length;
  const [coldStartVisible, setColdStartVisible] = useState(false);
  const [workspaceExpanded, setWorkspaceExpanded] = useState(false);

  const workspaceSubtitle = isHybrid
    ? `[${hybridLabel}]`
    : activeLink
      ? (getDisplayTitleForLink(activeLink) ?? activeLink.title)
      : undefined;

  const openLinkById = (linkId: string) => {
    const index = links.findIndex((link) => link.id === linkId);
    if (index >= 0) {
      selectLink(linkId);
      onSelectIndex(index);
    }
  };

  const handleSnapToContainer = async (slot: FixedContainerSlot, linkId: string) => {
    const link = links.find((entry) => entry.id === linkId);
    if (!link) {
      return;
    }

    snapTo(linkId, links[activeIndex]?.id ?? linkId);
    setActiveContainerSlot(slot);

    if (slot === FIXED_DATA_CONTAINER_ID) {
      await saveLinkToResourcePool(link);
      await refreshResourcePool();
      toast("리소스 풀에 저장했어요", { description: link.title });
      return;
    }

    if (slot === FIXED_CALENDAR_CONTAINER_ID) {
      if (reminderMap.has(linkId)) {
        toast("이미 액션 스트림에 있어요", { description: link.title });
        setActiveContainerSlot(FIXED_CALENDAR_CONTAINER_ID);
        setActiveActionsOpen(true);
        return;
      }
      setSchedulingLink(link);
    }
  };

  const handleDemoteToPool = async (linkId: string) => {
    const link = links.find((entry) => entry.id === linkId);
    demoteLinkFromActionStream(linkId);
    if (link) {
      await saveLinkToResourcePool(link);
      await refreshResourcePool();
      toast("리소스 풀로 옮겼어요", { description: "알람을 껐어요" });
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
        setActiveContainerSlot(FIXED_CALENDAR_CONTAINER_ID);
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
        className={cn(
          "action-shell flex h-full min-h-0 flex-1 flex-col overflow-hidden",
          className
        )}
      >
        <ChatWorkspaceChrome
          expanded={workspaceExpanded}
          onToggle={() => setWorkspaceExpanded((value) => !value)}
          subtitle={
            workspaceSubtitle ??
            (actionStream.length > 0
              ? `액션 ${actionStream.length} · 리소스 ${poolItems.length}`
              : undefined)
          }
          header={
            <header className="flex items-center justify-between px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <GlangoLogo className="h-6" />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="검색"
                  className="flex size-9 items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-black/[0.04]"
                >
                  <Search className="size-5" />
                </button>
                <Link
                  href="/welcome"
                  aria-label="설정"
                  className="flex size-9 items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-black/[0.04]"
                >
                  <Settings2 className="size-5" />
                </Link>
              </div>
            </header>
          }
        >
          {activeLink ? (
            <div className="max-h-[140px] shrink-0 overflow-hidden border-b border-black/[0.04]">
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

          <FixedContainerBar
            activeSlot={activeContainerSlot}
            hoverSlot={containerHoverSlot}
            activeActionCount={actionStream.length}
            resourceCount={poolItems.length}
            onSelectSlot={setActiveContainerSlot}
            onOpenCalendar={() => setActiveActionsOpen(true)}
            onOpenData={() => setResourcePoolOpen(true)}
            onHoverSlot={setContainerHoverSlot}
            className="border-b-0"
          />

          <ContainerChainStrip />

          <ActionChatContextTabs
            links={links}
            activeIndex={activeIndex}
            onSelect={onSelectIndex}
            chainedLinkIds={chainedLinkIds}
            hybridLabel={hybridLabel}
            isHybrid={isHybrid}
            chainedLinks={chainedLinks}
            onSnap={snapTo}
            onSelectLink={selectLink}
            onRemoveFromChain={removeFromChain}
            onClearChain={clearChain}
            containerHoverSlot={containerHoverSlot}
            scheduledLinkIds={scheduledLinkIds}
            onScheduleLink={(linkId) => {
              if (reminderMap.has(linkId)) {
                setActiveContainerSlot(FIXED_CALENDAR_CONTAINER_ID);
                setActiveActionsOpen(true);
                return;
              }
              const link = links.find((entry) => entry.id === linkId);
              if (link) {
                setSchedulingLink(link);
              }
            }}
            onSnapToContainer={(slot, linkId) => {
              void handleSnapToContainer(slot, linkId);
            }}
          />
        </ChatWorkspaceChrome>

        <section
          aria-label="채팅"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div
            ref={threadRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {!activeLink ? (
              <div className="px-5 pb-3 pt-4">
                <p className="text-[15px] leading-relaxed text-[#6B7280]">
                  사진·링크를 보내거나 아래에 말을 걸어 보세요.
                </p>
              </div>
            ) : null}

            {coldStartVisible ? (
              <OnboardingMagicPanel
                onSendSeed={(text) => void sendMessage(text)}
                onDismiss={() => setColdStartVisible(false)}
              />
            ) : null}

            {messages.length === 0 && !coldStartVisible ? (
              <div className="px-5 py-6">
                <p className="text-[14px] leading-relaxed text-[#9CA3AF]">
                  {activeLink
                    ? "무엇을 도와드릴까요? 아래 입력창에 말을 걸어 보세요."
                    : "링크를 추가하거나 사진을 보내 보세요."}
                </p>
              </div>
            ) : null}

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
            />
          </div>

          <ActionChatInputBar
            sending={sending}
            disabled={sending}
            onOpenCapture={onOpenCapture}
            onOpenLinkPaste={onOpenLinkPaste}
            onQuickCapture={onQuickCapture}
            onSendMessage={(text) => void sendMessage(text)}
            className="z-10 shrink-0 border-t border-black/[0.04] bg-[#F9FAFB]/95 backdrop-blur-md"
          />
        </section>
      </div>

      <ActionDatePickerSheet
        open={Boolean(datePickerRequest)}
        onOpenChange={(open) => {
          if (!open) {
            dismissDatePicker();
          }
        }}
        draftTask={datePickerRequest?.draft_task ?? "일정"}
        onConfirm={(value) => void confirmDatePicker(value)}
      />

      <ActiveActionsSheet
        open={activeActionsOpen}
        onOpenChange={setActiveActionsOpen}
        actions={actionStream}
        onCancelScheduled={cancelScheduledAction}
        onFireScheduledNow={triggerScheduledActionNow}
        onScrollToMessage={(messageId) => {
          const node = threadRef.current?.querySelector(
            `[data-message-id="${messageId}"]`
          );
          node?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
        onCancelLinkReminder={demoteLinkFromActionStream}
        onDemoteToPool={(linkId) => void handleDemoteToPool(linkId)}
        onOpenLink={openLinkById}
      />

      <ResourcePoolSheet
        open={resourcePoolOpen}
        onOpenChange={setResourcePoolOpen}
        onOpenLink={openLinkById}
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
