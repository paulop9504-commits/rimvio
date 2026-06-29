import type {
  CommitAutoEnvelope,
  RiskOperation,
} from "@/lib/context-run/execution-decision";
import { decideRiskOperation } from "@/lib/context-run/execution-decision";
import type { ExecutionDecisionKind } from "@/lib/context-run/types";

export class ContextRunCommitBlockedError extends Error {
  readonly code = "CONTEXT_RUN_COMMIT_BLOCKED" as const;
  readonly decision: ExecutionDecisionKind;
  readonly risk: RiskOperation;

  constructor(input: {
    decision: ExecutionDecisionKind;
    risk: RiskOperation;
    reason: string;
  }) {
    super(input.reason);
    this.name = "ContextRunCommitBlockedError";
    this.decision = input.decision;
    this.risk = input.risk;
  }
}

const ENVELOPE_RISK: Record<
  CommitAutoEnvelope,
  readonly RiskOperation[]
> = {
  market_quick_list_one_liner: ["publish_external", "publish_listing"],
  context_text_ingest: ["none"],
  photo_attach: ["none"],
  gps_dwell_confirm: ["none"],
};

/**
 * Sole gate before any truth write — Decision + optional approval or auto envelope.
 * PR reject: Commit without passing this for risky ops.
 */
export function assertCommitPermitted(input: {
  risk: RiskOperation;
  approvalGranted?: boolean;
  autoEnvelope?: CommitAutoEnvelope | null;
}): void {
  const decision = decideRiskOperation(input.risk);
  if (decision !== "approval_required") {
    return;
  }

  if (input.approvalGranted === true) {
    return;
  }

  const envelope = input.autoEnvelope ?? null;
  if (envelope && ENVELOPE_RISK[envelope].includes(input.risk)) {
    return;
  }

  throw new ContextRunCommitBlockedError({
    decision,
    risk: input.risk,
    reason: `Commit blocked: ${input.risk} requires approval_required or auto envelope`,
  });
}

export function isCommitPermitted(input: {
  risk: RiskOperation;
  approvalGranted?: boolean;
  autoEnvelope?: CommitAutoEnvelope | null;
}): boolean {
  try {
    assertCommitPermitted(input);
    return true;
  } catch {
    return false;
  }
}
