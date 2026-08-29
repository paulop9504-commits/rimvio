/**
 * P4 — Approval Engine — risk → auto | notify | require approval.
 */

import { getHubToolCatalogEntry, type ToolRiskLevel } from "@/lib/hub/dev/hub-tool-catalog";

export type ApprovalDecision = "auto" | "notify_user" | "require_approval";

export type ApprovalEvaluation = {
  readonly decision: ApprovalDecision;
  readonly risk: ToolRiskLevel;
  readonly reasonKo: string;
};

export function evaluateToolApproval(input: {
  readonly toolId: string;
  readonly publish?: boolean;
}): ApprovalEvaluation {
  if (input.publish || input.toolId === "publish.request") {
    return {
      decision: "require_approval",
      risk: "high",
      reasonKo: "Production Publish — 사용자 승인 필요",
    };
  }

  const entry = getHubToolCatalogEntry(input.toolId);
  if (!entry) {
    return { decision: "auto", risk: "low", reasonKo: "unknown tool — default auto" };
  }

  if (entry.requiresApproval) {
    return {
      decision: "require_approval",
      risk: entry.risk,
      reasonKo: `${entry.label} — 승인 필요`,
    };
  }

  if (entry.risk === "high") {
    return {
      decision: "require_approval",
      risk: "high",
      reasonKo: `${entry.label} — 고위험 변경`,
    };
  }

  if (entry.risk === "medium" || input.toolId === "connection.connect") {
    return {
      decision: input.toolId === "connection.connect" ? "notify_user" : "auto",
      risk: entry.risk,
      reasonKo:
        input.toolId === "connection.connect"
          ? "외부 연결 — OAuth 필요"
          : `${entry.label} — Workspace 변경`,
    };
  }

  return { decision: "auto", risk: "low", reasonKo: `${entry.label} — 자동 실행` };
}

/** Map approval decision to legacy hub loop policy. */
export function approvalToLegacyPolicy(
  decision: ApprovalDecision,
): "auto" | "ask_user" | "require_approval" {
  switch (decision) {
    case "require_approval":
      return "require_approval";
    case "notify_user":
      return "ask_user";
    default:
      return "auto";
  }
}
