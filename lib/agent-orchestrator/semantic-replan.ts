/**
 * Semantic replanning — above retry/skip in replanOnFailure (P7).
 */

import type { PlanDAG } from "@/lib/reality-planner/types";
import { replanOnFailure } from "@/lib/reality-planner/replan-on-failure";
import type { AgentFailureClass } from "@/lib/agent-orchestrator/failure-classification";
import type { AgentObservation } from "@/lib/agent/types";
import type { RimvioToolId } from "@/lib/tool-registry";

export type SemanticReplanResult = {
  readonly dag: PlanDAG;
  readonly summaryKo: string;
  readonly alternativeToolId?: RimvioToolId;
  readonly relaxedConstraint?: string;
};

export function semanticReplanFromFailure(input: {
  readonly dag: PlanDAG;
  readonly failedNodeId: string;
  readonly failureClass: AgentFailureClass;
  readonly observation: AgentObservation;
  readonly utterance?: string;
}): SemanticReplanResult {
  let dag = replanOnFailure(input.dag, input.failedNodeId);

  switch (input.failureClass) {
    case "empty_result":
      return {
        dag,
        summaryKo: "검색 결과 없음 — 조건 완화 또는 대체 검색",
        alternativeToolId: input.observation.stepKind === "resolve_entity" ? "maps.search" : "hotel.lookup",
        relaxedConstraint: "entityLabelKo",
      };
    case "constraint_conflict":
      return {
        dag,
        summaryKo: "제약 충돌 — 일정/예산 조건 재조정",
        relaxedConstraint: "dates_or_budget",
      };
    case "transient":
    case "tool_failure":
      return {
        dag,
        summaryKo: "도구 실패 — 재시도 또는 대체 경로",
      };
    case "human_commit_required":
      return {
        dag,
        summaryKo: "Human Commit 필요 — 자동 확정 금지",
      };
    case "permission_required":
      return {
        dag,
        summaryKo: "권한 필요 — 사용자 확인",
      };
    case "invalid_input":
      return {
        dag,
        summaryKo: "입력 부족 — 사용자에게 clarifying question",
      };
    default:
      return {
        dag,
        summaryKo: "복구 불가 — 설명 후 중단",
      };
  }
}
