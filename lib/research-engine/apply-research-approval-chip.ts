/**
 * Apply / reject Research approval chip — Cursor-style human gate.
 * Apply prepares next step; does not silently Commit Reality.
 */

import {
  appendContextAgentComposeTurn,
  markOperatorAskChipsTurnSubmitted,
} from "@/lib/globe/assistant/context-agent-compose-thread-store";
import { commitContextExecutionPlanFromApproval } from "@/lib/context-execution/commit-plan-from-approval";
import { needsContextExecutionAnyApproval } from "@/lib/context-execution/resolve-plan-approval-gate";
import { readContextExecutionPlanFromEvent } from "@/lib/context-execution/context-execution-plan-metadata";
import { persistContextExecutionPlanClient } from "@/lib/context-execution/persist-context-execution-plan-client";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  clearResearchApprovalGate,
  markResearchApprovalGateDecision,
  readResearchApprovalGate,
} from "@/lib/research-engine/research-approval-store";

export type ApplyResearchApprovalChipResult = {
  readonly handled: boolean;
  readonly decision: "apply" | "reject" | "revise" | null;
  readonly summaryKo: string;
};

export function applyResearchApprovalChip(input: {
  contextEventId: string;
  turnId: string;
  chipId: string;
  value: string;
  labelKo: string;
}): ApplyResearchApprovalChipResult {
  const contextEventId = input.contextEventId.trim();
  const value = input.value.trim().toLowerCase();
  if (!contextEventId) {
    return { handled: false, decision: null, summaryKo: "" };
  }

  const gate = readResearchApprovalGate(contextEventId);
  if (!gate || gate.status !== "waiting_approval") {
    // Still mark chip submitted so UI closes.
    markOperatorAskChipsTurnSubmitted(contextEventId, input.turnId, {
      chipId: input.chipId,
      summaryKo: input.labelKo,
    });
    return {
      handled: true,
      decision: null,
      summaryKo: "승인 대기 상태가 이미 끝났어요",
    };
  }

  if (value === "apply") {
    markResearchApprovalGateDecision(contextEventId, "approved");
    const event = findLifeEventCandidate(contextEventId);
    const plan = readContextExecutionPlanFromEvent(event);
    let planNote = "";
    if (plan && needsContextExecutionAnyApproval(plan)) {
      const advanced = commitContextExecutionPlanFromApproval({ plan });
      if (advanced) {
        persistContextExecutionPlanClient({
          contextEventId,
          plan: advanced,
        });
        planNote = " · 실행 계획 승인 반영";
      }
    }

    const summaryKo = `이 근거로 진행 승인 · 「${gate.bestTitle}」${planNote}`;
    markOperatorAskChipsTurnSubmitted(contextEventId, input.turnId, {
      chipId: input.chipId,
      summaryKo,
    });
    appendContextAgentComposeTurn(contextEventId, {
      role: "assistant",
      kind: "text",
      text: [
        `「${gate.bestTitle}」로 진행을 승인했어요.`,
        "AI는 준비만 했고, Reality Commit은 맞춤(Field)에서 한 번 더 확인해요.",
        gate.sectorSummariesKo.length > 0
          ? `섹터: ${gate.sectorSummariesKo.map((s) => s.split("·")[0]?.trim() ?? s).join(" · ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
    return { handled: true, decision: "apply", summaryKo };
  }

  if (value === "revise") {
    markResearchApprovalGateDecision(contextEventId, "rejected");
    clearResearchApprovalGate(contextEventId);
    const summaryKo = "조건 바꿔 다시 조사";
    markOperatorAskChipsTurnSubmitted(contextEventId, input.turnId, {
      chipId: input.chipId,
      summaryKo,
    });
    appendContextAgentComposeTurn(contextEventId, {
      role: "assistant",
      kind: "text",
      text: [
        "거절했어요. 예산·동선·리뷰 중 우선할 렌즈를 말해 주세요.",
        "예: 「10만원대 우선」 · 「역 근처」 · 「리뷰 많은 쪽」",
      ].join("\n"),
    });
    return { handled: true, decision: "revise", summaryKo };
  }

  // reject
  markResearchApprovalGateDecision(contextEventId, "rejected");
  clearResearchApprovalGate(contextEventId);
  const summaryKo = "이 결과 거절";
  markOperatorAskChipsTurnSubmitted(contextEventId, input.turnId, {
    chipId: input.chipId,
    summaryKo,
  });
  appendContextAgentComposeTurn(contextEventId, {
    role: "assistant",
    kind: "text",
    text: "이 조사 결과는 쓰지 않을게요. 새로 조건을 말해 주세요.",
  });
  return { handled: true, decision: "reject", summaryKo };
}
