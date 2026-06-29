"use client";

import { useGlobeExecutionFeed } from "@/hooks/use-globe-execution-feed";
import { GlobeComposeChatThread } from "@/components/globe/execution-feed/globe-compose-chat-thread";
import { GlobeExecutionArtifactCard } from "@/components/globe/execution-feed/globe-execution-artifact-card";
import { GlobeExecutionPillBar } from "@/components/globe/execution-feed/globe-execution-pill-bar";
import { cn } from "@/lib/utils";

export type GlobeExecutionFeedProps = {
  className?: string;
};

/**
 * Claude-inspired execution projection above Goal composer.
 * Not chat — goal pill + step pills + one active artifact.
 */
export function GlobeExecutionFeed({ className }: GlobeExecutionFeedProps) {
  const { state, togglePill, toggleArtifactTab } = useGlobeExecutionFeed();
  const run = state.run;

  if (!run) {
    return null;
  }

  const activePill =
    run.activePillId != null
      ? run.pills.find((pill) => pill.id === run.activePillId) ?? null
      : null;
  const expandedPill =
    run.expandedPillId != null
      ? run.pills.find((pill) => pill.id === run.expandedPillId) ?? null
      : null;
  const artifactExpanded =
    activePill != null &&
    (activePill.status === "running" ||
      activePill.status === "waiting_user" ||
      activePill.status === "pending")
      ? true
      : expandedPill != null && run.expandedPillId === expandedPill.id;

  const chatQuestion =
    run.artifact?.kind === "question" && run.artifact.summaryLineKo
      ? run.artifact.summaryLineKo
      : null;
  const chatMode = Boolean(chatQuestion && run.goalKo);

  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      data-globe-execution-feed
      data-globe-execution-graph-id={run.graphId}
    >
      {chatMode ? (
        <GlobeComposeChatThread
          userText={run.goalKo!}
          assistantText={chatQuestion!}
        />
      ) : (
        <>
          <GlobeExecutionPillBar
            pills={run.pills}
            activePillId={run.activePillId}
            expandedPillId={run.expandedPillId}
            onTogglePill={togglePill}
          />

          {run.artifact && artifactExpanded ? (
            <GlobeExecutionArtifactCard
              artifact={run.artifact}
              pill={expandedPill ?? activePill}
              expanded
              onTabChange={toggleArtifactTab}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
