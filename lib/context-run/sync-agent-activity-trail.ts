/**
 * Unified Agent Activity Trail — Cursor-style streaming progress for every Agent/Continuum run.
 * Mirrors transcript → Execution Feed · optional Globe chat · 「펼치기」CTA (no hard Workspace open).
 */

import {
  finishAgentActivityTranscript,
  readAgentActivityTranscript,
  type AgentActivityEvent,
} from "@/lib/context-run/agent-activity-transcript";
import {
  dispatchExecutionFeedArtifact,
  dispatchExecutionFeedGoal,
  dispatchExecutionFeedStep,
} from "@/lib/context-run/execution-feed-bridge";
import { resolveActiveComposerGraphId } from "@/lib/context-run/resolve-active-composer-graph-id";
import { syncPortalComposeClarifyToChat } from "@/lib/globe/chat/sync-portal-compose-to-chat";
import { appendGlobeChatTextMessage } from "@/lib/globe/chat/globe-chat-session-store";
import { copy } from "@/lib/copy/human-ko";

export const WORKSPACE_EXPAND_SLOT_ID = "workspace_expand";
export const WORKSPACE_EXPAND_CHOICE_ID = "expand";

const TRAIL_STEP = "agent_activity_trail";

function feedGraphId(goalKo: string): string {
  return resolveActiveComposerGraphId(goalKo);
}

/** Start Execution Feed lane for this Agent run (mirrors Activity transcript). */
export function beginAgentActivityTrail(input: {
  readonly goalKo: string;
  readonly contextEventId?: string | null;
}): void {
  const graphId = feedGraphId(input.goalKo);
  dispatchExecutionFeedGoal({
    graphId,
    goalKo: input.goalKo.trim().slice(0, 80) || "작업 실행",
  });
  dispatchExecutionFeedStep({
    graphId,
    stepId: `${TRAIL_STEP}:boot`,
    labelKo: copy.globe.activityTrail.boot,
    status: "running",
  });
  dispatchExecutionFeedStep({
    graphId,
    stepId: `${TRAIL_STEP}:boot`,
    labelKo: copy.globe.activityTrail.boot,
    status: "done",
    resultKo: input.contextEventId?.slice(0, 12) ?? "ok",
  });
}

/** Mirror one transcript/stage event into the Execution Feed. */
export function syncAgentActivityEventToFeed(
  event: AgentActivityEvent,
  goalKo: string,
): void {
  const graphId = feedGraphId(goalKo);
  dispatchExecutionFeedStep({
    graphId,
    stepId: `${TRAIL_STEP}:${event.id}`,
    labelKo: event.labelKo,
    status: "done",
    resultKo: event.detailKo?.slice(0, 40) ?? event.metricKo?.slice(0, 40) ?? null,
  });
}

/** Flush transcript events → feed artifact + finish tape. */
export function finishAgentActivityTrail(input: {
  readonly goalKo: string;
  readonly summaryKo?: string | null;
  readonly contextEventId?: string | null;
  /** Soft open — chat 「펼치기」only; never hard expand Workspace. */
  readonly offerExpand?: boolean;
}): void {
  const graphId = feedGraphId(input.goalKo);
  const tape = readAgentActivityTranscript();
  if (tape) {
    for (const event of tape.events) {
      syncAgentActivityEventToFeed(event, input.goalKo);
    }
  }
  finishAgentActivityTranscript({
    summaryKo: input.summaryKo ?? copy.globe.activityTrail.done,
  });

  const events = readAgentActivityTranscript()?.events ?? tape?.events ?? [];
  dispatchExecutionFeedArtifact({
    graphId,
    stepId: TRAIL_STEP,
    artifact: {
      kind: "progress",
      titleKo: copy.globe.activityTrail.title,
      summaryLineKo:
        input.summaryKo?.trim() || copy.globe.activityTrail.done,
      checklist: events.slice(-8).map((e) => ({
        id: e.id,
        titleKo: e.labelKo,
        done: true,
        priorityKo: e.detailKo?.slice(0, 24) ?? null,
        priorityTone: "low" as const,
      })),
      tabs: [
        { id: "trail", labelKo: copy.globe.activityTrail.tabTrail },
        { id: "files", labelKo: copy.globe.activityTrail.tabFiles },
      ],
      activeTabId: "trail",
    },
  });

  if (input.offerExpand && input.contextEventId?.trim()) {
    offerWorkspaceExpandChip({
      graphId,
      contextEventId: input.contextEventId.trim(),
      summaryKo: input.summaryKo ?? null,
    });
  }
}

/** Cursor-like: trail finished → 「펼치기」to open Workspace (not auto). */
export function offerWorkspaceExpandChip(input: {
  readonly graphId: string;
  readonly contextEventId: string;
  readonly summaryKo?: string | null;
}): boolean {
  const line =
    input.summaryKo?.trim() ||
    copy.globe.activityTrail.expandHint;
  appendGlobeChatTextMessage({
    graphId: input.graphId,
    role: "assistant",
    text: line,
  });
  return syncPortalComposeClarifyToChat({
    graphId: input.graphId,
    userText: "",
    questionKo: copy.globe.activityTrail.expandAsk,
    clarifyKind: "slot",
    slotId: WORKSPACE_EXPAND_SLOT_ID,
    choices: [
      {
        id: `${WORKSPACE_EXPAND_CHOICE_ID}:${input.contextEventId}`,
        labelKo: copy.globe.workspacePreviewExpand,
      },
    ],
  });
}

/** Sync one status line into Globe chat (Agent handled, ingest path). */
export function syncAgentTrailStatusToChat(input: {
  readonly goalKo: string;
  readonly userText: string;
  readonly statusKo: string | null;
}): void {
  const graphId = feedGraphId(input.goalKo);
  const text = input.statusKo?.trim();
  if (!text) return;
  // Avoid double-echo if dispatch already wrote the same turn.
  appendGlobeChatTextMessage({
    graphId,
    role: "assistant",
    text,
  });
}
