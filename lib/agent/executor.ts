/**
 * Workspace Agent Runtime — Executor (STEP 7).
 *
 * Plan → Draft only. Agent Commit is forbidden.
 */

import {
  createDraftFromIntent,
  type RealityDraft,
} from "@/lib/draft";
import type {
  AgentRuntimePlan,
  AgentRuntimeReasoning,
} from "@/lib/agent/runtime-planner";
import { assertNoRealityCommitFromAgent } from "@/lib/workspace-agent/validator";
import { findSimilar } from "@/lib/reality-graph";
import { readWorkspace } from "@/lib/workspace/workspace-store";

export type AgentExecuteOk = {
  readonly ok: true;
  readonly draft: RealityDraft;
  readonly alternativesKo: readonly string[];
  readonly commitForbidden: true;
};

export type AgentExecuteFail = {
  readonly ok: false;
  readonly reasonKo: string;
  readonly realityCommitAttempted: boolean;
};

export type AgentExecuteResult = AgentExecuteOk | AgentExecuteFail;

/**
 * Execute Operator Plan → Reality Draft (proposed).
 * Never applies Draft. Never Reality Commits.
 */
export function executeAgentPlan(input: {
  readonly workspaceId: string;
  readonly utterance: string;
  readonly plan: AgentRuntimePlan;
  readonly reasoning: AgentRuntimeReasoning;
}): AgentExecuteResult {
  assertNoRealityCommitFromAgent("draft");

  if (!input.plan.commitForbidden) {
    return {
      ok: false,
      reasonKo: "Agent Plan에 Commit이 포함될 수 없어요",
      realityCommitAttempted: true,
    };
  }

  if (
    input.plan.intent.action === ("commit" as never) ||
    input.plan.intent.action === ("reality_commit" as never)
  ) {
    return {
      ok: false,
      reasonKo: "Agent Commit 금지 · Draft만 가능",
      realityCommitAttempted: true,
    };
  }

  const draft = createDraftFromIntent({
    workspaceId: input.workspaceId,
    intent: input.plan.intent,
    sourceText: input.utterance,
    mirrorWorkspaceCommand: true,
  });

  if (draft.status !== "proposed") {
    return {
      ok: false,
      reasonKo: "Draft가 proposed로 생성되지 않았어요",
      realityCommitAttempted: false,
    };
  }

  const alternativesKo: string[] = [];
  const ws = readWorkspace(input.workspaceId);
  const selected =
    ws?.objects.find((o) => o.selected && o.kind === "hotel") ??
    ws?.objects.find((o) => o.kind === "hotel" && o.visible) ??
    null;

  if (selected?.entityId && input.plan.intent.action === "replace") {
    const similar = findSimilar(selected.entityId, { limit: 3 });
    for (const e of similar) {
      alternativesKo.push(
        String(e.properties.name ?? e.properties.title ?? e.id),
      );
    }
  }

  if (
    alternativesKo.length === 0 &&
    input.reasoning.recommendationKo === "대체 호텔 발견"
  ) {
    alternativesKo.push("대체 호텔 후보 (Workspace)");
  }

  return {
    ok: true,
    draft,
    alternativesKo,
    commitForbidden: true,
  };
}

/** Explicit Commit path — always throws / rejects */
export function executeAgentCommit(): never {
  assertNoRealityCommitFromAgent("reality_commit");
  throw new Error("unreachable: Agent Commit forbidden");
}
