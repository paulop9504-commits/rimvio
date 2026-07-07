"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ComposeIntentSpectrumBar } from "@/components/globe/chat/compose-intent-spectrum-bar";
import { FlowStatusBar } from "@/components/globe/chat/flow-status-bar";
import { GlobeChatAnswerHint } from "@/components/globe/chat/globe-chat-answer-hint";
import { GlobeChatCompletionCard } from "@/components/globe/chat/globe-chat-completion-card";
import { GlobeChatEmptyState } from "@/components/globe/chat/globe-chat-empty-state";
import { GlobeChatSlotChips } from "@/components/globe/chat/globe-chat-slot-chips";
import { GlobeComposeDraftCard } from "@/components/globe/execution-feed/globe-compose-draft-card";
import { AgentProgressList } from "@/components/ui/agent-progress-list";
import {
  GlobeContextIngestBar,
  type GlobeContextIngestBarHandle,
  type GlobeContextIngestBarProps,
} from "@/components/globe/globe-context-ingest-bar";
import { useGlobeChatSession } from "@/hooks/use-globe-chat-session";
import { useGlobeExecutionFeed } from "@/hooks/use-globe-execution-feed";
import { readActiveRunState } from "@/lib/context-run/run-state-store";
import { copy } from "@/lib/copy/human-ko";
import { findMarketIntentByEventId } from "@/lib/globe/market/market-alignment-store";
import { sellItemDraftCanPublish } from "@/lib/portal/compose-draft/draft-utils";
import { buildGlobeChatActionHint } from "@/lib/portal/compose-draft/build-globe-chat-action-hint";
import { readProductTaxonomyConfirmLabelKo } from "@/lib/portal/compose-draft/product-taxonomy-registry";
import { readPillSubmitText } from "@/components/globe/globe-action-pill-guide";
import { SELL_ITEM_FLOW, findNextSellItemFlowStep, readSellItemFlowOptionsFromComposeState, resolveSellItemFlow } from "@/lib/portal/compose-draft/sell-item-flow";
import {
  buildMatchAgentTasks,
  matchAgentTasksComplete,
} from "@/lib/resource/build-match-agent-tasks";
import { resolveResourceStatus } from "@/lib/resource/resolve-resource-status";
import { readPortalComposeRunState } from "@/lib/portal/portal-compose-run-store";
import {
  resolveGlobeChatPipelinePhase,
  resolveGlobeComposePipelineLabel,
} from "@/lib/globe/assistant";
import { readGlobeChatGraphId } from "@/lib/globe/chat/ensure-globe-chat-graph-id";
import { resetGlobeComposeChatSession } from "@/lib/portal/reset-globe-compose-chat";
import { globeChatLight } from "@/lib/design/globe-chat-light-theme";
import { cn } from "@/lib/utils";

export type GlobeChatScreenProps = {
  open: boolean;
  onClose: () => void;
  ingest: GlobeContextIngestBarProps;
  onArtifactPrimaryAction?: () => void;
  onArtifactSecondaryAction?: () => void;
  onViewInnerGlobe?: (input: {
    eventId: string;
    anchorLat: number;
    anchorLng: number;
  }) => void;
  onViewOuterGlobe?: (input: {
    eventId: string;
    anchorLat: number;
    anchorLng: number;
  }) => void;
};

function readChatHeaderSubtitle(
  composeState: ReturnType<typeof readPortalComposeRunState>,
): string {
  const macroStage = composeState?.macroStage;
  if (macroStage === "category_scope") {
    return copy.globe.chatScreenSubtitleCategory;
  }
  if (macroStage === "description_ready") {
    return copy.globe.chatScreenSubtitleDescription;
  }
  if (macroStage === "publish_review") {
    return copy.globe.chatScreenSubtitleReview;
  }
  const stage = composeState?.intentStage?.stage;
  if (stage === "soft_signal") {
    return copy.globe.chatScreenSubtitleSoft;
  }
  if (
    stage === "confirmed" &&
    (composeState?.status === "waiting_slot" || composeState?.pendingClarifyKind)
  ) {
    return copy.globe.chatScreenSubtitleFill;
  }
  return copy.globe.chatScreenSubtitleChat;
}

function draftCardHasValues(
  artifact: import("@/lib/context-run/execution-feed-types").ExecutionFeedArtifact | null,
): boolean {
  if (!artifact?.composeDraft) {
    return false;
  }
  return artifact.composeDraft.fields.some((field) => field.valueKo.trim().length > 0);
}

function formatPriceKrw(priceKrw: number | null | undefined): string | null {
  if (priceKrw == null || !Number.isFinite(priceKrw)) {
    return null;
  }
  return `${priceKrw.toLocaleString("ko-KR")}원`;
}

function readComposeSummaryItems(
  composeState: ReturnType<typeof readPortalComposeRunState>,
): string[] {
  if (!composeState) {
    return [];
  }
  const items: string[] = [];
  const roleLabel =
    composeState.marketRole === "listing"
      ? copy.globe.chatSummaryRoleListing
      : composeState.marketRole === "seeking"
        ? copy.globe.chatSummaryRoleSeeking
        : null;
  if (roleLabel) {
    items.push(roleLabel);
  }
  const categoryLabel = readProductTaxonomyConfirmLabelKo(
    composeState.productCategoryId ?? composeState.proposedCategoryId ?? null,
  );
  if (categoryLabel) {
    items.push(categoryLabel);
  }
  const productName = composeState.composeDraft?.productName?.trim();
  if (productName) {
    items.push(productName);
  }
  const priceLabel = formatPriceKrw(composeState.composeDraft?.priceKrw);
  if (priceLabel) {
    items.push(priceLabel);
  }
  const placeLabel = composeState.composeDraft?.placeLabel?.trim();
  if (placeLabel) {
    items.push(placeLabel);
  }
  return items;
}

/** Fullscreen Globe chat — sole creation surface for compose flows. */
export function GlobeChatScreen({
  open,
  onClose,
  ingest,
  onArtifactPrimaryAction,
  onArtifactSecondaryAction,
  onViewInnerGlobe,
  onViewOuterGlobe,
}: GlobeChatScreenProps) {
  const { state: feedState } = useGlobeExecutionFeed();
  const graphId =
    feedState.run?.graphId?.trim() ||
    readGlobeChatGraphId() ||
    readActiveRunState()?.graphId?.trim() ||
    "";
  const { messages } = useGlobeChatSession(graphId);
  const composeState = readPortalComposeRunState(graphId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ingestRef = useRef<GlobeContextIngestBarHandle>(null);
  const [highlightBar, setHighlightBar] = useState(false);

  const artifact = feedState.run?.artifact ?? null;
  const flowDraft = composeState?.composeDraft ?? {};
  const showDraftCard =
    open &&
    composeState?.status === "ready" &&
    artifact?.kind === "compose_draft" &&
    draftCardHasValues(artifact) &&
    sellItemDraftCanPublish(flowDraft);
  const showFlowBar =
    open &&
    composeState?.intentStage?.stage === "confirmed" &&
    composeState?.composeSchemaId === "sell_item" &&
    composeState.composeDraft != null;
  const showIntentSpectrum =
    open &&
    composeState?.intentStage != null &&
    composeState.intentStage.stage !== "chatting";

  const submitChipAnswer = (answer: string) => {
    void ingestRef.current?.submitComposerText(answer);
  };

  const handleResetComposeChat = () => {
    if (!graphId.trim()) {
      return;
    }
    resetGlobeComposeChatSession(graphId);
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, open, showDraftCard]);

  useEffect(() => {
    if (!composeState?.composeDraft?.status || composeState.composeDraft.status !== "submitted") {
      return;
    }
    setHighlightBar(true);
    const timer = window.setTimeout(() => setHighlightBar(false), 1200);
    return () => window.clearTimeout(timer);
  }, [composeState?.composeDraft?.status]);

  const chatMatchTasks = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.kind !== "resource_complete" || !message.visibility.outerGlobe) {
        continue;
      }
      const record = findMarketIntentByEventId(message.eventId);
      if (!record) {
        return null;
      }
      const tasks = buildMatchAgentTasks(resolveResourceStatus({ record }));
      return matchAgentTasksComplete(tasks) ? null : tasks;
    }
    return null;
  }, [messages]);

  const actionHint = useMemo(
    () =>
      buildGlobeChatActionHint({
        composeState,
        messages,
      }),
    [composeState, messages],
  );
  const sellItemFlow = useMemo(() => {
    if (composeState?.composeSchemaId !== "sell_item") {
      return SELL_ITEM_FLOW;
    }
    return resolveSellItemFlow(readSellItemFlowOptionsFromComposeState(composeState));
  }, [composeState]);

  const chatPlaceholderOverride = useMemo(() => {
    if (composeState?.composeSchemaId !== "sell_item") {
      return null;
    }
    const draft = composeState.composeDraft ?? {};
    const flowOptions = readSellItemFlowOptionsFromComposeState(composeState);
    const next = findNextSellItemFlowStep(draft, flowOptions);

    if (next?.slotKey === "photos" && !composeState.pendingSlotId) {
      return copy.globe.chatInputPlaceholderMedia;
    }
    if (next?.slotKey === "note" && !composeState.pendingSlotId) {
      return copy.globe.chatInputPlaceholderNote;
    }
    if (composeState.status === "ready" && sellItemDraftCanPublish(draft)) {
      return copy.globe.chatInputPlaceholderPublish;
    }
    return null;
  }, [composeState]);
  const headerSubtitle = useMemo(() => {
    const pipeline = resolveGlobeChatPipelinePhase(composeState);
    if (pipeline !== "idle") {
      return resolveGlobeComposePipelineLabel(pipeline);
    }
    return readChatHeaderSubtitle(composeState);
  }, [composeState]);
  const showEmptyState = messages.length === 0 && !showDraftCard;
  const summaryItems = useMemo(() => readComposeSummaryItems(composeState), [composeState]);

  if (!open) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        key="globe-chat-screen"
        className={cn("fixed inset-0 z-[60] flex flex-col", globeChatLight.screen)}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 340 }}
        data-globe-chat-screen
        data-globe-chat-tone="light"
      >
        <header
          className={cn(
            "flex shrink-0 items-center justify-between px-4 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))]",
            globeChatLight.headerBorder,
            "border-b bg-white/80 backdrop-blur-md",
          )}
        >
          <div className="min-w-0">
            <p className={cn("text-[15px] font-semibold tracking-[-0.01em]", globeChatLight.title)}>
              {copy.globe.chatScreenTitle}
            </p>
            <p className={cn("mt-0.5 text-[12px]", globeChatLight.subtitle)}>{headerSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "flex size-9 items-center justify-center rounded-full transition-colors",
              globeChatLight.closeBtn,
            )}
            aria-label={copy.globe.chatScreenCloseAria}
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        {showIntentSpectrum && composeState?.intentStage ? (
          <ComposeIntentSpectrumBar
            intentStage={composeState.intentStage}
            onReset={handleResetComposeChat}
            tone="light"
          />
        ) : null}

        {showFlowBar ? (
          <FlowStatusBar
            draft={flowDraft}
            flow={sellItemFlow}
            highlightComplete={highlightBar}
            tone="light"
          />
        ) : null}

        {summaryItems.length > 0 ? (
          <div className="shrink-0 border-b border-black/[0.05] bg-[#fbfbfc] px-4 py-2.5">
            <div className="mx-auto flex w-full max-w-lg flex-col gap-1">
              <p className="text-[11px] font-medium text-[#8b95a1]">
                {copy.globe.chatSummaryTitle}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {summaryItems.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-white px-2.5 py-1 text-[12px] text-[#191f28] ring-1 ring-black/[0.06]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-6"
          data-globe-chat-messages
        >
          <div className="mx-auto flex w-full max-w-lg flex-col gap-3.5">
            {showEmptyState ? (
              <GlobeChatEmptyState onPillSelect={submitChipAnswer} />
            ) : null}
            {messages.map((message) => {
              if (message.kind === "resource_complete") {
                return (
                  <div key={message.id} className="flex justify-start">
                    <GlobeChatCompletionCard
                      message={message}
                      tone="light"
                      onViewInnerGlobe={
                        onViewInnerGlobe
                          ? () =>
                              onViewInnerGlobe({
                                eventId: message.eventId,
                                anchorLat: message.anchorLat,
                                anchorLng: message.anchorLng,
                              })
                          : undefined
                      }
                      onViewOuterGlobe={
                        onViewOuterGlobe
                          ? () =>
                              onViewOuterGlobe({
                                eventId: message.eventId,
                                anchorLat: message.anchorLat,
                                anchorLng: message.anchorLng,
                              })
                          : undefined
                      }
                    />
                  </div>
                );
              }
              if (message.kind === "image") {
                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="relative max-w-[72%] overflow-hidden rounded-[1rem] shadow-[0_2px_10px_rgba(0,0,0,0.1)] ring-1 ring-black/[0.06]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={message.remoteUrl ?? message.localUrl}
                        alt=""
                        className="max-h-48 w-full object-cover"
                      />
                      {message.status === "uploading" ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[11px] text-white">
                          {copy.globe.chatImageUploading}
                        </span>
                      ) : null}
                      {message.status === "failed" ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[11px] text-[#ff6961]">
                          {copy.globe.chatImageFailed}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              }
              if (message.kind === "slot_prompt") {
                const chipChoices =
                  message.clarifyKind === "category_pick"
                    ? message.categoryOptions ?? []
                    : message.choices ?? [];
                return (
                  <div key={message.id} className="flex justify-start">
                    <div className={cn("max-w-[92%]", globeChatLight.aiBubble)}>
                      <p className="whitespace-pre-wrap">{message.text}</p>
                      <GlobeChatSlotChips
                        choices={chipChoices}
                        tone="light"
                        variant={
                          message.clarifyKind === "category_confirm" ||
                          message.clarifyKind === "price_confirm"
                            ? "confirm"
                            : message.clarifyKind === "category_pick"
                              ? "category"
                              : "slot"
                        }
                        onSelect={(choice) => {
                          const answer =
                            message.clarifyKind === "category_pick"
                              ? choice.id
                              : choice.labelKo;
                          submitChipAnswer(answer);
                        }}
                      />
                    </div>
                  </div>
                );
              }
              if (message.role === "user") {
                return (
                  <div key={message.id} className="flex justify-end">
                    <p className={cn("max-w-[88%] whitespace-pre-wrap", globeChatLight.userBubble)}>
                      {message.text}
                    </p>
                  </div>
                );
              }
              return (
                <div key={message.id} className="flex justify-start">
                  <p className={cn("max-w-[92%] whitespace-pre-wrap", globeChatLight.aiBubble)}>
                    {message.text}
                  </p>
                </div>
              );
            })}

            {chatMatchTasks ? (
              <div className="flex justify-start">
                <div className={cn("max-w-[92%]", globeChatLight.cardSurface)}>
                  <AgentProgressList
                    titleKo={copy.globe.agentProgress.matchSearchTitle}
                    tasks={chatMatchTasks}
                    variant="light"
                    layout="vertical"
                  />
                </div>
              </div>
            ) : null}

            {showDraftCard && artifact?.composeDraft ? (
              <GlobeComposeDraftCard
                graphId={graphId}
                composeDraft={artifact.composeDraft}
                tone="light"
                primaryActionLabelKo={artifact.primaryActionLabelKo}
                secondaryActionLabelKo={artifact.secondaryActionLabelKo}
                onPrimaryAction={onArtifactPrimaryAction}
                onSecondaryAction={onArtifactSecondaryAction}
              />
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "relative z-[2] shrink-0 px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2",
            globeChatLight.composerBar,
          )}
          data-globe-chat-composer
        >
          <div className="mx-auto w-full max-w-[min(100%,20rem)] space-y-1.5">
            {actionHint && !showEmptyState ? (
              <GlobeChatAnswerHint
                bodyKo={actionHint.bodyKo}
                pills={actionHint.pills}
                onPillSelect={(pill) => submitChipAnswer(readPillSubmitText(pill))}
                tone="light"
                className="rounded-[0.875rem] bg-white px-3 py-2 shadow-[0_1px_6px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.05]"
              />
            ) : null}
            <GlobeContextIngestBar
              ref={ingestRef}
              {...ingest}
              mapPromptMode={false}
              compactPill
              chatPlaceholderOverride={chatPlaceholderOverride}
              className="w-full"
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
