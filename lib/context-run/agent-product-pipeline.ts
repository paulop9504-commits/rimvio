/**
 * Agent Product Pipeline (ADR-050) — single ordered stage list for NL → Workspace.
 *
 * Internal spine (ADR-045 `enterRimvioAgentRuntime`) is the OS loop.
 * This module is the **product** stage tape every Workspace NL turn must advance.
 */

import { spineIngressFromLegacy } from "@/lib/workstream/spine-ingress-helpers";
import {
  appendAgentActivityForStage,
  beginAgentActivityTranscript,
  readAgentActivityTranscript,
} from "@/lib/context-run/agent-activity-transcript";
import { syncAgentActivityEventToFeed } from "@/lib/context-run/sync-agent-activity-trail";
import { runNlIntentCompilerStage } from "@/lib/context-run/compile-nl-intent";
import type { RimvioIntentFrame } from "@/lib/rimvio-protocol/intent";
import type { CapabilityIntentResolution } from "@/lib/rimvio-index/types";
import { resolveCapabilityIntent } from "@/lib/rimvio-index/resolve-capability-intent";
import {
  resolveCompositeLoopFromUtterance,
  wantsCompositeResume,
} from "@/lib/agent-platform/composite/resolve-composite-loop";
import { readPersistedGoalState } from "@/lib/agent-platform/persistence/goal-state";

export const AGENT_PRODUCT_PIPELINE_STAGES = [
  "intent",
  "context_resolution",
  "planner",
  "object_discovery",
  "object_enrichment",
  "candidate_evaluation",
  "workspace_patch",
  "projection",
  "agent_status",
  "prepare",
  "commit",
] as const;

export type AgentProductPipelineStage =
  (typeof AGENT_PRODUCT_PIPELINE_STAGES)[number];

/** Work-log lines (chat is status, not answer). */
export const AGENT_PRODUCT_PIPELINE_STATUS_KO: Record<
  AgentProductPipelineStage,
  string
> = {
  intent: "Intent 이해 중…",
  context_resolution: "Context 확인 중…",
  planner: "작업 계획 중…",
  object_discovery: "후보 검색 중…",
  object_enrichment: "정보 연결 중…",
  candidate_evaluation: "후보 평가 중…",
  workspace_patch: "Workspace 반영 중…",
  projection: "화면 갱신 중…",
  agent_status: "상태 정리 중…",
  prepare: "예약 준비 중…",
  commit: "승인 대기 중…",
};

export type AgentProductTurn = {
  readonly contextEventId: string;
  readonly utterance: string;
  readonly stagesCompleted: readonly AgentProductPipelineStage[];
  readonly statusLog: readonly string[];
  readonly spineEntered: boolean;
  readonly lastVerifyOk: boolean;
  readonly failedStage: AgentProductPipelineStage | null;
  readonly intentFrame?: RimvioIntentFrame | null;
  readonly intentWorkLogKo?: string | null;
  readonly capabilityIntent?: CapabilityIntentResolution | null;
  readonly compositeLoopId?: string | null;
  readonly wantsResume?: boolean;
};

let lastProductTurn: AgentProductTurn | null = null;
const turnListeners = new Set<() => void>();

function emitProductTurnChange(): void {
  for (const l of turnListeners) l();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rimvio:agent-product-turn"));
  }
}

export function subscribeAgentProductTurn(listener: () => void): () => void {
  turnListeners.add(listener);
  return () => {
    turnListeners.delete(listener);
  };
}

export function readLastAgentProductTurn(): AgentProductTurn | null {
  return lastProductTurn;
}

export function clearLastAgentProductTurnForTests(): void {
  lastProductTurn = null;
  emitProductTurnChange();
}

/**
 * STEP 1 — every NL Workspace turn enters Spine + product pipeline.
 */
export function beginAgentProductTurn(input: {
  readonly contextEventId: string;
  readonly utterance: string;
  readonly source?: "context-run" | "action-chat" | "workstream" | "engine";
}): AgentProductTurn {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  spineIngressFromLegacy({
    source: input.source ?? "context-run",
    contextEventId: contextEventId || `product:${Date.now()}`,
    utterance,
    stage: "goal_state",
    syncGoal: Boolean(utterance),
    runJudgment: Boolean(utterance),
  });

  beginAgentActivityTranscript({
    contextEventId: contextEventId || `product:${Date.now()}`,
    utterance,
  });

  const intentCompiled = utterance ? runNlIntentCompilerStage(utterance) : null;
  const capabilityIntent = utterance
    ? resolveCapabilityIntent({
        utterance,
        contextEventId: contextEventId || null,
      })
    : null;
  const wantsResume = utterance ? wantsCompositeResume(utterance) : false;
  const compositeLoopId = utterance
    ? wantsResume
      ? readPersistedGoalState(contextEventId)?.compositeLoopId ??
        resolveCompositeLoopFromUtterance(utterance)
      : resolveCompositeLoopFromUtterance(utterance)
    : null;
  const intentStatus =
    capabilityIntent?.workLogKo ??
    (intentCompiled?.workLogKo && intentCompiled.commerceCapability
      ? intentCompiled.workLogKo
      : null);

  const turn: AgentProductTurn = {
    contextEventId,
    utterance,
    stagesCompleted: ["intent", "context_resolution"],
    statusLog: [
      intentStatus ?? AGENT_PRODUCT_PIPELINE_STATUS_KO.intent,
      AGENT_PRODUCT_PIPELINE_STATUS_KO.context_resolution,
    ],
    spineEntered: true,
    lastVerifyOk: Boolean(contextEventId),
    failedStage: contextEventId ? null : "context_resolution",
    intentFrame: intentCompiled?.intentFrame ?? null,
    intentWorkLogKo: intentCompiled?.workLogKo ?? null,
    capabilityIntent,
    compositeLoopId,
    wantsResume,
  };
  lastProductTurn = turn;
  emitProductTurnChange();
  return turn;
}

export function advanceAgentProductStage(
  turn: AgentProductTurn,
  stage: AgentProductPipelineStage,
  statusKo?: string | null,
): AgentProductTurn {
  if (turn.stagesCompleted.includes(stage)) {
    return turn;
  }
  const next: AgentProductTurn = {
    ...turn,
    stagesCompleted: [...turn.stagesCompleted, stage],
    statusLog: [
      ...turn.statusLog,
      statusKo?.trim() || AGENT_PRODUCT_PIPELINE_STATUS_KO[stage],
    ],
    lastVerifyOk: true,
    failedStage: null,
  };
  lastProductTurn = next;
  appendAgentActivityForStage(stage, {
    detailKo: statusKo?.trim() || null,
  });
  const tape = readAgentActivityTranscript();
  const last = tape?.events[tape.events.length - 1];
  if (last && turn.utterance) {
    syncAgentActivityEventToFeed(last, turn.utterance);
  }
  emitProductTurnChange();
  return next;
}

export function failAgentProductStage(
  turn: AgentProductTurn,
  stage: AgentProductPipelineStage,
  reasonKo?: string | null,
): AgentProductTurn {
  const next: AgentProductTurn = {
    ...turn,
    lastVerifyOk: false,
    failedStage: stage,
    statusLog: [
      ...turn.statusLog,
      reasonKo?.trim() || `${AGENT_PRODUCT_PIPELINE_STATUS_KO[stage]} 실패`,
    ],
  };
  lastProductTurn = next;
  emitProductTurnChange();
  return next;
}

/** STEP 11 — lightweight stage gates. */
export function verifyAgentProductStage(
  turn: AgentProductTurn,
  stage: AgentProductPipelineStage,
  ok: boolean,
  reasonKo?: string | null,
): AgentProductTurn {
  if (ok) return advanceAgentProductStage(turn, stage);
  return failAgentProductStage(turn, stage, reasonKo);
}

export function formatAgentProductStatusLog(
  turn: AgentProductTurn | null,
): string | null {
  if (!turn?.statusLog.length) return null;
  return turn.statusLog[turn.statusLog.length - 1] ?? null;
}

export function agentProductTurnHasStage(
  turn: AgentProductTurn | null,
  stage: AgentProductPipelineStage,
): boolean {
  return Boolean(turn?.stagesCompleted.includes(stage));
}
