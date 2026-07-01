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
import { findNextFlowStep } from "@/lib/portal/compose-draft/flow-step-types";
import { SELL_ITEM_FLOW } from "@/lib/portal/compose-draft/sell-item-flow";
import {
  buildMatchAgentTasks,
  matchAgentTasksComplete,
} from "@/lib/resource/build-match-agent-tasks";
import { resolveResourceStatus } from "@/lib/resource/resolve-resource-status";
import { readPortalComposeRunState } from "@/lib/portal/portal-compose-run-store";
import { resetGlobeComposeChatSession } from "@/lib/portal/reset-globe-compose-chat";
import type { GlobeChatMessage } from "@/lib/globe/chat/globe-chat-session-types";
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

function readPendingAnswerHint(messages: readonly GlobeChatMessage[]): string | null {
  const last = messages[messages.length - 1];
  if (last?.kind === "slot_prompt") {
    const hasChips =
      (last.choices?.length ?? 0) > 0 || (last.categoryOptions?.length ?? 0) > 0;
    if (hasChips) {
      return null;
    }
    return last.text.trim() || null;
  }
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.kind === "slot_prompt") {
      return message.text.trim() || null;
    }
    if (message?.role === "assistant" && message.kind === "text") {
      return message.text.trim() || null;
    }
  }
  return null;
}

function draftCardHasValues(
  artifact: import("@/lib/context-run/execution-feed-types").ExecutionFeedArtifact | null,
): boolean {
  if (!artifact?.composeDraft) {
    return false;
  }
  return artifact.composeDraft.fields.some((field) => field.valueKo.trim().length > 0);
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

  const answerHint = useMemo(() => readPendingAnswerHint(messages), [messages]);
  const chatPlaceholderOverride = useMemo(() => {
    if (
      composeState?.status === "waiting_slot" ||
      composeState?.status === "conversing" ||
      composeState?.status === "drafting"
    ) {
      return null;
    }
    if (composeState?.composeSchemaId !== "sell_item") {
      return null;
    }
    const draft = composeState.composeDraft ?? {};
    const next = findNextFlowStep(draft, SELL_ITEM_FLOW.slice(0, -1));
    if (next?.slotKey === "photos") {
      return copy.globe.chatInputPlaceholderMedia;
    }
    if (next?.slotKey === "note") {
      return copy.globe.chatInputPlaceholderNote;
    }
    if (composeState.status === "ready" && sellItemDraftCanPublish(draft)) {
      return copy.globe.chatInputPlaceholderPublish;
    }
    return null;
  }, [composeState]);
  const headerSubtitle = readChatHeaderSubtitle(composeState);
  const showEmptyState = messages.length === 0 && !showDraftCard;

  if (!open) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        key="globe-chat-screen"
        className="fixed inset-0 z-[60] flex flex-col bg-[#0b0c0f]"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 340 }}
        data-globe-chat-screen
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white/90">{copy.globe.chatScreenTitle}</p>
            <p className="mt-0.5 text-[11px] text-white/45">{headerSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-white/8 text-white ring-1 ring-white/12"
            aria-label={copy.globe.chatScreenCloseAria}
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        {showIntentSpectrum && composeState?.intentStage ? (
          <ComposeIntentSpectrumBar
            intentStage={composeState.intentStage}
            onReset={handleResetComposeChat}
          />
        ) : null}

        {showFlowBar ? (
          <FlowStatusBar
            draft={flowDraft}
            flow={SELL_ITEM_FLOW}
            highlightComplete={highlightBar}
          />
        ) : null}

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-6"
          data-globe-chat-messages
        >
          <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
            {showEmptyState ? <GlobeChatEmptyState /> : null}
            {messages.map((message) => {
              if (message.kind === "resource_complete") {
                return (
                  <div key={message.id} className="flex justify-start">
                    <GlobeChatCompletionCard
                      message={message}
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
                    <div className="relative max-w-[72%] overflow-hidden rounded-[1rem] ring-1 ring-white/12">
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
                    <div className="max-w-[92%] rounded-[1rem] rounded-bl-md bg-[#121316]/92 px-3 py-2.5 ring-1 ring-white/14">
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/92">
                        {message.text}
                      </p>
                      <GlobeChatSlotChips
                        choices={chipChoices}
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
                    <p className="max-w-[88%] whitespace-pre-wrap rounded-[1rem] rounded-br-md bg-white/14 px-3 py-2 text-[13px] leading-relaxed text-white ring-1 ring-white/12">
                      {message.text}
                    </p>
                  </div>
                );
              }
              return (
                <div key={message.id} className="flex justify-start">
                  <p className="max-w-[92%] whitespace-pre-wrap rounded-[1rem] rounded-bl-md bg-[#121316]/92 px-3 py-2.5 text-[13px] leading-relaxed text-white/92 ring-1 ring-white/14">
                    {message.text}
                  </p>
                </div>
              );
            })}

            {chatMatchTasks ? (
              <div className="flex justify-start">
                <div className="max-w-[92%] rounded-[1rem] rounded-bl-md bg-[#121316]/92 px-3 py-2.5 ring-1 ring-white/14">
                  <AgentProgressList
                    titleKo={copy.globe.agentProgress.matchSearchTitle}
                    tasks={chatMatchTasks}
                    variant="dark"
                    layout="vertical"
                  />
                </div>
              </div>
            ) : null}

            {showDraftCard && artifact?.composeDraft ? (
              <GlobeComposeDraftCard
                graphId={graphId}
                composeDraft={artifact.composeDraft}
                primaryActionLabelKo={artifact.primaryActionLabelKo}
                secondaryActionLabelKo={artifact.secondaryActionLabelKo}
                onPrimaryAction={onArtifactPrimaryAction}
                onSecondaryAction={onArtifactSecondaryAction}
              />
            ) : null}
          </div>
        </div>

        <div
          className="relative z-[2] shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
          data-globe-chat-composer
        >
          <div className="mx-auto w-full max-w-[min(100%,20rem)] space-y-2">
            {answerHint ? (
              <GlobeChatAnswerHint
                questionKo={answerHint}
                tone="light"
                className="rounded-2xl bg-white px-3.5 py-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.05]"
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
