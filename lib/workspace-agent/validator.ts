/**
 * Validate Agent Draft Impact — Reality Commit always blocked.
 */

import type { WorkspaceActionProposal } from "@/lib/workspace-command/types";
import type { WorkspaceAgentValidation } from "@/lib/workspace-agent/types";
import { impactLinesKo } from "@/lib/workspace-command/impact-analyzer";

export function validateWorkspaceAgentImpact(input: {
  readonly proposal: WorkspaceActionProposal;
  readonly utterance: string;
}): WorkspaceAgentValidation {
  // Absolute: Agent never Reality Commits
  if (
    /commit|지구에|커밋|확정\s*결제/iu.test(input.utterance) ||
    input.proposal.draft.intent.action === ("commit" as never)
  ) {
    return {
      ok: false,
      reasonKo: "Reality Commit은 Agent가 할 수 없어요 · Field에서만 가능",
      impactSummaryKo: null,
      realityCommitBlocked: true,
    };
  }

  if (input.proposal.draft.status !== "proposed") {
    return {
      ok: false,
      reasonKo: "Draft가 proposed 상태가 아니에요",
      impactSummaryKo: null,
      realityCommitBlocked: true,
    };
  }

  const lines = impactLinesKo(input.proposal.draft.impact);
  return {
    ok: true,
    reasonKo: "Draft Impact 검증 통과 · 적용은 사용자 승인 후",
    impactSummaryKo: lines.join(" · "),
    realityCommitBlocked: true,
  };
}

export function assertNoRealityCommitFromAgent(op: string): void {
  if (
    op === "commit" ||
    op === "reality_commit" ||
    op === "globe_commit" ||
    op === "stamp_globe"
  ) {
    throw new Error(
      "Workspace Reality Agent: Reality Commit forbidden — Draft / Request Apply only",
    );
  }
}
