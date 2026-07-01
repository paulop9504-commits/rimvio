"use client";

import { useGlobeExecutionFeed } from "@/hooks/use-globe-execution-feed";
import { GlobeComposeChatThread } from "@/components/globe/execution-feed/globe-compose-chat-thread";
import { GlobeExecutionArtifactCard } from "@/components/globe/execution-feed/globe-execution-artifact-card";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeExecutionFeedProps = {
  className?: string;
  onArtifactPrimaryAction?: () => void;
};

function readAssistantLine(
  artifact: import("@/lib/context-run/execution-feed-types").ExecutionFeedArtifact | null,
): string | null {
  if (!artifact) {
    return null;
  }
  if (artifact.kind === "question" && artifact.summaryLineKo) {
    return artifact.summaryLineKo;
  }
  if (artifact.summaryLineKo?.trim()) {
    return artifact.summaryLineKo.trim();
  }
  if (artifact.bodyKo?.trim()) {
    return artifact.bodyKo.trim();
  }
  return copy.globe.executionFeed.marketPortalHint;
}

/**
 * Globe composer — chatbot thread with inline execution cards (not a separate sheet).
 */
export function GlobeExecutionFeed({
  className,
  onArtifactPrimaryAction,
}: GlobeExecutionFeedProps) {
  const { state, toggleArtifactTab } = useGlobeExecutionFeed();
  const run = state.run;

  if (!run?.goalKo) {
    return null;
  }

  const assistantText = readAssistantLine(run.artifact);
  const inlineArtifact =
    run.artifact && run.artifact.kind !== "question" ? run.artifact : null;

  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      data-globe-execution-feed
      data-globe-execution-graph-id={run.graphId}
      data-globe-execution-feed-mode="chat"
    >
      {assistantText ? (
        <GlobeComposeChatThread userText={run.goalKo} assistantText={assistantText}>
          {inlineArtifact ? (
            <GlobeExecutionArtifactCard
              artifact={inlineArtifact}
              expanded
              onTabChange={toggleArtifactTab}
              onPrimaryAction={onArtifactPrimaryAction}
            />
          ) : null}
        </GlobeComposeChatThread>
      ) : null}
    </div>
  );
}
