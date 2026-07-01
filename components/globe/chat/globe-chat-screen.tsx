"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { FlowStatusBar } from "@/components/globe/chat/flow-status-bar";
import { GlobeChatCompletionCard } from "@/components/globe/chat/globe-chat-completion-card";
import { GlobeComposeDraftCard } from "@/components/globe/execution-feed/globe-compose-draft-card";
import { AgentProgressList } from "@/components/ui/agent-progress-list";
import {
  GlobeContextIngestBar,
  type GlobeContextIngestBarProps,
} from "@/components/globe/globe-context-ingest-bar";
import { useGlobeChatSession } from "@/hooks/use-globe-chat-session";
import { useGlobeExecutionFeed } from "@/hooks/use-globe-execution-feed";
import { copy } from "@/lib/copy/human-ko";
import { findMarketIntentByEventId } from "@/lib/globe/market/market-alignment-store";
import { composeDraftHasValues } from "@/lib/portal/compose-draft/draft-utils";
import {
  buildMatchAgentTasks,
  matchAgentTasksComplete,
} from "@/lib/resource/build-match-agent-tasks";
import { resolveResourceStatus } from "@/lib/resource/resolve-resource-status";
import { SELL_ITEM_FLOW } from "@/lib/portal/compose-draft/sell-item-flow";
import { readPortalComposeRunState } from "@/lib/portal/portal-compose-run-store";
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
  const graphId = feedState.run?.graphId ?? "";
  const { messages } = useGlobeChatSession(graphId);
  const composeState = readPortalComposeRunState(graphId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [highlightBar, setHighlightBar] = useState(false);

  const artifact = feedState.run?.artifact ?? null;
  const showDraftCard = artifact?.kind === "compose_draft" && draftCardHasValues(artifact);
  const showFlowBar =
    open &&
    composeState?.intentStage?.stage === "confirmed" &&
    composeState?.composeSchemaId === "sell_item" &&
    composeState.composeDraft != null;

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

  const flowDraft = composeState?.composeDraft ?? {};

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
          <p className="text-[13px] font-semibold text-white/90">{copy.globe.chatScreenTitle}</p>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-white/8 text-white ring-1 ring-white/12"
            aria-label={copy.globe.chatScreenCloseAria}
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        {showFlowBar ? (
          <FlowStatusBar
            draft={flowDraft}
            flow={SELL_ITEM_FLOW}
            highlightComplete={highlightBar}
          />
        ) : null}

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
          data-globe-chat-messages
        >
          <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
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

            {showDraftCard && artifact?.composeDraft && composeDraftHasValues(flowDraft) ? (
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
          className={cn(
            "shrink-0 border-t border-white/8 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2",
          )}
        >
          <GlobeContextIngestBar
            {...ingest}
            mapPromptMode={false}
            className="mx-auto w-full max-w-lg"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
