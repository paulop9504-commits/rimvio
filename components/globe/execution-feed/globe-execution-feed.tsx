"use client";

import { useGlobeExecutionFeed } from "@/hooks/use-globe-execution-feed";
import { GlobeComposeChatThread } from "@/components/globe/execution-feed/globe-compose-chat-thread";
import { GlobeComposeDraftCard } from "@/components/globe/execution-feed/globe-compose-draft-card";
import { GlobeExecutionArtifactCard } from "@/components/globe/execution-feed/globe-execution-artifact-card";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeExecutionFeedProps = {
  className?: string;
  onArtifactPrimaryAction?: () => void;
  onArtifactSecondaryAction?: () => void;
};

function draftCardHasValues(
  artifact: import("@/lib/context-run/execution-feed-types").ExecutionFeedArtifact,
): boolean {
  if (artifact.kind !== "compose_draft" || !artifact.composeDraft) {
    return false;
  }
  return artifact.composeDraft.fields.some((field) => field.valueKo.trim().length > 0);
}

function readAssistantLine(
  artifact: import("@/lib/context-run/execution-feed-types").ExecutionFeedArtifact | null,
): string | null {
  if (!artifact) {
    return null;
  }
  if (artifact.summaryLineKo?.trim()) {
    return artifact.summaryLineKo.trim();
  }
  if (artifact.kind === "question" && artifact.bodyKo?.trim()) {
    return artifact.bodyKo.trim();
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
  onArtifactSecondaryAction,
}: GlobeExecutionFeedProps) {
  const { state, toggleArtifactTab } = useGlobeExecutionFeed();
  const run = state.run;

  if (!run?.goalKo) {
    return null;
  }

  const assistantText = readAssistantLine(run.artifact);
  const composeDraftArtifact =
    run.artifact && draftCardHasValues(run.artifact) ? run.artifact : null;
  const legacyArtifact =
    run.artifact &&
    run.artifact.kind !== "question" &&
    run.artifact.kind !== "compose_draft"
      ? run.artifact
      : null;

  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      data-globe-execution-feed
      data-globe-execution-graph-id={run.graphId}
      data-globe-execution-feed-mode="chat"
    >
      {assistantText ? (
        <GlobeComposeChatThread userText={run.goalKo} assistantText={assistantText}>
          {composeDraftArtifact?.composeDraft ? (
            <GlobeComposeDraftCard
              graphId={run.graphId}
              composeDraft={composeDraftArtifact.composeDraft}
              primaryActionLabelKo={composeDraftArtifact.primaryActionLabelKo}
              secondaryActionLabelKo={composeDraftArtifact.secondaryActionLabelKo}
              onPrimaryAction={onArtifactPrimaryAction}
              onSecondaryAction={onArtifactSecondaryAction}
            />
          ) : null}
          {legacyArtifact ? (
            <GlobeExecutionArtifactCard
              artifact={legacyArtifact}
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
