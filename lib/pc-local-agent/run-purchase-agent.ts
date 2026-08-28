/**
 * Purchase as a Cursor-style Agent Run — plan, install missing programs, dispatch,
 * keep polling. Never stop on "PC offline". Human Commit still owns payment.
 */

import { copy } from "@/lib/copy/human-ko";
import { appendPcContinuityPreviewTurn } from "@/lib/pc-local-agent/append-preview-turn";
import {
  beginAgentActivityTranscript,
  appendAgentActivityEvent,
  finishAgentActivityTranscript,
} from "@/lib/context-run/agent-activity-transcript";
import {
  beginAgentActivityTrail,
  finishAgentActivityTrail,
} from "@/lib/context-run/sync-agent-activity-trail";
import { ensureGlobeChatGraphId } from "@/lib/globe/chat/ensure-globe-chat-graph-id";
import {
  syncPortalComposeProgramInstallToChat,
  syncPortalComposeTurnToChat,
} from "@/lib/globe/chat/sync-portal-compose-to-chat";
import { PC_SETUP_UPDATE_QUERY } from "@/lib/pc-local-agent/program-install-catalog";
import { RIMVIO_PC_SETUP_VERSION } from "@/lib/pc-local-agent/setup-url";
import type { PcAgentTask } from "@/lib/pc-local-agent";
import { readExecutionPhase } from "@/lib/pc-local-agent/execution-phase";
import {
  clearPendingPcPurchase,
  patchPendingPcPurchase,
  readPendingPcPurchase,
  writePendingPcPurchase,
} from "@/lib/pc-local-agent/pending-purchase-intent";
import {
  runPcPurchaseContinuity,
  type PcPurchaseContinuityResult,
} from "@/lib/pc-local-agent/run-purchase-continuity";
import { extractPcPurchaseTitle } from "@/lib/pc-local-agent/purchase-intent";

const WATCH_MS = 3_000;
const TASK_POLL_MS = 2_000;
let watchTimer: number | null = null;
let taskTimer: number | null = null;
let lastPhase = "";
let watchBusy = false;

function pcCopy() {
  return copy.globe.pcContinuity;
}

function startTrail(utterance: string, contextEventId: string | null): void {
  const title = extractPcPurchaseTitle(utterance);
  const goalKo = pcCopy().agentRunGoal(title);
  beginAgentActivityTranscript({
    contextEventId: contextEventId?.trim() || `shop:${Date.now()}`,
    utterance,
  });
  beginAgentActivityTrail({
    goalKo,
    contextEventId,
  });
  appendAgentActivityEvent({
    kind: "thought",
    labelKo: pcCopy().agentPlan,
    detailKo: title,
    stage: "planner",
  });
}

function applyResultToChat(input: {
  utterance: string;
  result: Exclude<PcPurchaseContinuityResult, { kind: "skip" }>;
  contextEventId: string | null;
}): void {
  const graphId = ensureGlobeChatGraphId();
  if (input.result.kind === "arming") {
    syncPortalComposeProgramInstallToChat({
      graphId,
      userText: input.utterance,
      assistantText: `${input.result.messageKo}\n${pcCopy().programOfferBody}`,
      query: input.result.query,
    });
    return;
  }
  if (input.result.kind === "preview") {
    if (input.contextEventId?.trim()) {
      appendPcContinuityPreviewTurn(input.contextEventId.trim(), input.result);
    }
    syncPortalComposeTurnToChat({
      graphId,
      userText: input.utterance,
      assistantText: input.result.messageKo,
    });
    if (input.result.needsUpdate) {
      syncPortalComposeProgramInstallToChat({
        graphId,
        userText: input.utterance,
        assistantText: input.result.appVersion
          ? pcCopy().versionMismatch(input.result.appVersion, RIMVIO_PC_SETUP_VERSION)
          : pcCopy().versionUnknown(RIMVIO_PC_SETUP_VERSION),
        query: PC_SETUP_UPDATE_QUERY,
      });
    }
    return;
  }
  syncPortalComposeTurnToChat({
    graphId,
    userText: input.utterance,
    assistantText: input.result.messageKo,
  });
}

function stopTaskWatch(): void {
  if (taskTimer) {
    clearInterval(taskTimer);
    taskTimer = null;
  }
}

function watchTask(
  taskId: string,
  goalKo: string,
  contextEventId: string | null,
  utterance: string,
): void {
  stopTaskWatch();
  lastPhase = "";
  const startedAt = Date.now();
  let warnedStuck = false;
  const tick = async () => {
    try {
      const res = await fetch(`/api/pc-agent/tasks/${encodeURIComponent(taskId)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as { task?: PcAgentTask };
      const task = data.task;
      if (!task) {
        return;
      }
      const phase = readExecutionPhase(task);
      if (
        !warnedStuck &&
        (phase === "QUEUED" || phase === "PC_OFFLINE") &&
        Date.now() - startedAt > 4_000
      ) {
        warnedStuck = true;
        appendAgentActivityEvent({
          kind: "status",
          labelKo: pcCopy().agentNeedLatest(RIMVIO_PC_SETUP_VERSION),
          stage: "agent_status",
        });
        syncPortalComposeProgramInstallToChat({
          graphId: ensureGlobeChatGraphId(),
          userText: utterance,
          assistantText: pcCopy().agentNeedLatest(RIMVIO_PC_SETUP_VERSION),
          query: PC_SETUP_UPDATE_QUERY,
        });
      }
      if (phase === lastPhase) {
        return;
      }
      lastPhase = phase;
      if (phase === "RUNNING" || phase === "DISPATCHED") {
        appendAgentActivityEvent({
          kind: "tool",
          labelKo: pcCopy().agentOpeningShop,
          stage: "object_discovery",
        });
      }
      if (phase === "BROWSER_OPENED" || phase === "PAGE_READY") {
        appendAgentActivityEvent({
          kind: "tool",
          labelKo: pcCopy().stepBrowserOpen,
          stage: "prepare",
        });
      }
      if (phase === "ACTION_RUNNING") {
        appendAgentActivityEvent({
          kind: "patch",
          labelKo: copy.globe.liveWorkStepProduct,
          stage: "workspace_patch",
        });
      }
      if (phase === "WAITING_USER" || phase === "HUMAN_REQUIRED" || phase === "AUTH_REQUIRED") {
        finishAgentActivityTrail({
          goalKo,
          summaryKo: pcCopy().agentAwaitHuman,
          contextEventId,
        });
        stopTaskWatch();
      }
      if (phase === "COMPLETED") {
        finishAgentActivityTrail({
          goalKo,
          summaryKo: pcCopy().stepReady,
          contextEventId,
        });
        stopTaskWatch();
        clearPendingPcPurchase();
      }
      if (phase === "FAILED" || phase === "CANCELLED") {
        finishAgentActivityTranscript({ summaryKo: pcCopy().stepFailed });
        stopTaskWatch();
      }
    } catch {
      /* keep watching */
    }
  };
  void tick();
  if (typeof window !== "undefined") {
    taskTimer = window.setInterval(() => void tick(), TASK_POLL_MS);
  }
}

async function dispatchPending(): Promise<void> {
  const pending = readPendingPcPurchase();
  if (!pending || watchBusy) {
    return;
  }
  if (pending.taskId) {
    return;
  }
  watchBusy = true;
  try {
    const result = await runPcPurchaseContinuity(
      pending.utterance,
      pending.contextEventId ?? undefined,
    );
    if (result.kind === "preview") {
      appendAgentActivityEvent({
        kind: "tool",
        labelKo: result.queuedOffline
          ? pcCopy().agentWaitingOnline
          : pcCopy().agentQueued,
        stage: "object_discovery",
      });
      if (pending.contextEventId) {
        appendPcContinuityPreviewTurn(pending.contextEventId, result);
      }
      patchPendingPcPurchase({ taskId: result.task.id });
      const goalKo = pcCopy().agentRunGoal(extractPcPurchaseTitle(pending.utterance));
      watchTask(result.task.id, goalKo, pending.contextEventId, pending.utterance);
      if (!result.queuedOffline) {
        /* still watch phases */
      }
    }
  } finally {
    watchBusy = false;
  }
}

export function ensurePcPurchaseAgentWatch(): void {
  if (typeof window === "undefined" || watchTimer) {
    return;
  }
  watchTimer = window.setInterval(() => {
    void dispatchPending();
  }, WATCH_MS);
  void dispatchPending();
}

export async function startPcPurchaseAgentRun(input: {
  utterance: string;
  contextEventId?: string | null;
}): Promise<PcPurchaseContinuityResult> {
  const utterance = input.utterance.trim();
  const contextEventId = input.contextEventId?.trim() || null;
  const title = extractPcPurchaseTitle(utterance);
  const goalKo = pcCopy().agentRunGoal(title);

  startTrail(utterance, contextEventId);
  const result = await runPcPurchaseContinuity(utterance, contextEventId ?? undefined);
  if (result.kind === "skip") {
    finishAgentActivityTranscript();
    return result;
  }

  applyResultToChat({ utterance, result, contextEventId });

  if (result.kind === "login") {
    appendAgentActivityEvent({
      kind: "status",
      labelKo: result.messageKo,
      stage: "agent_status",
    });
    finishAgentActivityTrail({
      goalKo,
      summaryKo: result.messageKo,
      contextEventId,
    });
    return result;
  }

  if (result.kind === "arming") {
    appendAgentActivityEvent({
      kind: "tool",
      labelKo: pcCopy().agentNeedPrograms,
      stage: "prepare",
    });
    writePendingPcPurchase({ utterance, contextEventId });
    ensurePcPurchaseAgentWatch();
    return result;
  }

  appendAgentActivityEvent({
    kind: "tool",
    labelKo: result.queuedOffline ? pcCopy().agentWaitingOnline : pcCopy().agentQueued,
    stage: "object_discovery",
  });
  writePendingPcPurchase({
    utterance,
    contextEventId,
    taskId: result.task.id,
  });
  ensurePcPurchaseAgentWatch();
  watchTask(result.task.id, goalKo, contextEventId, utterance);
  return result;
}

export function resetPcPurchaseAgentWatchForTests(): void {
  if (watchTimer) {
    clearInterval(watchTimer);
    watchTimer = null;
  }
  stopTaskWatch();
  watchBusy = false;
  lastPhase = "";
  clearPendingPcPurchase();
}
