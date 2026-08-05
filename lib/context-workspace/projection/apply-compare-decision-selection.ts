/**
 * Compare Decision Selection → Draft → Action Preparation.
 *
 * Select is not a UI checkbox — it creates a Reality-Commit-ready Decision state.
 * Never auto-Commits (Article 0 — human owns Commit).
 */

import { applyWorkspaceTransition } from "@/lib/context-workspace/apply-workspace-transition";
import { prepareWorkspaceNodeBooking } from "@/lib/context-workspace/prepare-workspace-booking";
import {
  selectCompareDecisionEntity,
  exitCompareDecisionProjection,
} from "@/lib/context-workspace/projection/compare-decision-state";
import { setWorkspaceNodeActionReadyState } from "@/lib/context-workspace/set-node-action-ready-state";
import {
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import type { DecisionProjection } from "@/lib/context-workspace/projection/types";

export type ApplyCompareDecisionSelectionResult =
  | {
      readonly ok: true;
      readonly entityId: string;
      readonly titleKo: string;
      readonly judgmentKo: string | null;
      readonly prepared: boolean;
      readonly actionReadyState: "prepare" | "ready";
      readonly workspace: ContextWorkspaceState;
      readonly replyKo: string;
    }
  | {
      readonly ok: false;
      readonly reasonKo: string;
    };

/**
 * User Select on DecisionCallout:
 *   Selected Entity → Workspace Draft Update → Action Preparation
 * Then UI may open Commit Preview (human Confirm).
 */
export function applyCompareDecisionSelection(input: {
  readonly contextEventId: string;
  readonly entityId: string;
  readonly decision?: DecisionProjection | null;
  /** Exit compare_decision projection after select (default true). */
  readonly exitProjection?: boolean;
}): ApplyCompareDecisionSelectionResult {
  const contextEventId = input.contextEventId.trim();
  const entityId = input.entityId.trim();
  if (!contextEventId || !entityId) {
    return { ok: false, reasonKo: "선택이 비어 있어요" };
  }

  selectCompareDecisionEntity({ contextEventId, entityId });

  applyWorkspaceTransition({
    contextEventId,
    op: "select",
    nodeIds: [entityId],
  });

  let state = readContextWorkspace(contextEventId);
  if (!state) {
    return { ok: false, reasonKo: "Workspace가 없어요" };
  }

  const node = state.nodes.find((n) => n.id === entityId);
  if (!node) {
    return { ok: false, reasonKo: "후보를 찾을 수 없어요" };
  }

  const judgmentKo =
    input.decision?.judgmentKo?.trim() ||
    null;

  // Draft update — Decision stamped into Workspace SSOT
  setWorkspaceNodeActionReadyState({
    contextEventId,
    nodeId: entityId,
    state: "prepare",
  });

  state = readContextWorkspace(contextEventId);
  if (!state) {
    return { ok: false, reasonKo: "Draft 반영에 실패했어요" };
  }

  const stamped: ContextWorkspaceState = {
    ...state,
    lastChangeKo: judgmentKo
      ? `선택 · ${judgmentKo}`
      : `선택 · ${node.title}`,
    lastWhy: {
      actionKo: "Compare Decision 선택",
      reasonsKo: judgmentKo
        ? [judgmentKo, "Context-weighted Decision"]
        : ["Context-weighted Decision"],
      impactsKo: ["예약 준비 가능 · Commit 대기"],
      nodeIds: [entityId],
      atIso: new Date().toISOString(),
    },
    updatedAtIso: new Date().toISOString(),
  };
  writeContextWorkspace(stamped);

  const preparedNode = {
    ...node,
    selected: true,
    actionReadyState: "prepare" as const,
  };

  const prep = prepareWorkspaceNodeBooking({
    contextEventId,
    node: preparedNode,
    contextLabelKo: stamped.summaryKo || stamped.query,
  });

  let actionReadyState: "prepare" | "ready" = "prepare";
  let prepared = false;
  if (prep.ok) {
    setWorkspaceNodeActionReadyState({
      contextEventId,
      nodeId: entityId,
      state: "ready",
    });
    actionReadyState = "ready";
    prepared = true;
  }

  const workspace = readContextWorkspace(contextEventId) ?? stamped;

  if (input.exitProjection !== false) {
    exitCompareDecisionProjection(contextEventId);
  }

  return {
    ok: true,
    entityId,
    titleKo: node.title,
    judgmentKo,
    prepared,
    actionReadyState,
    workspace,
    replyKo: prepared
      ? `${node.title} 준비됨 · Commit으로 확정하세요`
      : prep.ok === false
        ? `${node.title} 선택됨 · ${prep.reasonKo}`
        : `${node.title} 선택됨 · 준비 중`,
  };
}
