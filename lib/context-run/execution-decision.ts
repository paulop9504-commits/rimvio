import type { ExecutionDecisionKind } from "@/lib/context-run/types";

/** Irreversible or third-party effects — always Decision-gated before Commit. */
export type RiskOperation =
  | "none"
  | "publish_listing"
  | "publish_external"
  | "payment"
  | "handshake_confirm"
  | "send_external";

/** Explicit auto envelopes — documented product permission, not model judgment. */
export type CommitAutoEnvelope =
  | "market_quick_list_one_liner"
  | "context_text_ingest"
  | "photo_attach"
  | "gps_dwell_confirm";

export type ComposerDecisionPhase =
  | "market_bare"
  | "market_compose"
  | "market_supply_pass"
  | "text_committed"
  | "discovery_market_hint";

export type RunGraphNodeId =
  | "slot_media"
  | "slot_price"
  | "slot_place"
  | "approval_publish"
  | "approval_pay"
  | "approval_handshake"
  | "match_running"
  | "match_done"
  | "lodging_done"
  | "multi_run_overview";

export type SlotId = "media" | "price" | "place" | "role" | "description";

const RISK_DECISION: Record<Exclude<RiskOperation, "none">, ExecutionDecisionKind> =
  {
    publish_listing: "approval_required",
    publish_external: "approval_required",
    payment: "approval_required",
    handshake_confirm: "approval_required",
    send_external: "approval_required",
  };

/** Risky Commit operations — publish / pay / handshake are never `auto` without envelope. */
export function decideRiskOperation(risk: RiskOperation): ExecutionDecisionKind {
  if (risk === "none") {
    return "auto";
  }
  return RISK_DECISION[risk];
}

export function decideSlotExecution(slotId: SlotId): ExecutionDecisionKind {
  switch (slotId) {
    case "media":
    case "price":
    case "place":
    case "role":
    case "description":
      return "ask";
    default: {
      const _exhaustive: never = slotId;
      return _exhaustive;
    }
  }
}

export function decideNodeExecution(node: RunGraphNodeId): ExecutionDecisionKind {
  switch (node) {
    case "slot_media":
    case "slot_price":
    case "slot_place":
      return "ask";
    case "approval_publish":
    case "approval_pay":
    case "approval_handshake":
      return "approval_required";
    case "match_running":
      return "auto";
    case "match_done":
    case "lodging_done":
      return "recommend";
    case "multi_run_overview":
      return "auto";
    default: {
      const _exhaustive: never = node;
      return _exhaustive;
    }
  }
}

/** Deterministic Decision for Globe composer submit — LLM must not replace. */
export function decideComposerExecution(
  phase: ComposerDecisionPhase,
): ExecutionDecisionKind {
  switch (phase) {
    case "market_bare":
    case "market_compose":
    case "market_supply_pass":
    case "discovery_market_hint":
      return "recommend";
    case "text_committed":
      return "auto";
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

/**
 * Merge node + risk into one Decision — strictest wins.
 * ask < recommend < auto < approval_required (risk bumps to approval).
 */
export function mergeExecutionDecision(
  ...candidates: readonly ExecutionDecisionKind[]
): ExecutionDecisionKind {
  if (candidates.includes("approval_required")) {
    return "approval_required";
  }
  if (candidates.includes("ask")) {
    return "ask";
  }
  if (candidates.includes("recommend")) {
    return "recommend";
  }
  return "auto";
}

export function decideRunTurn(input: {
  node?: RunGraphNodeId | null;
  slotId?: SlotId | null;
  risk?: RiskOperation;
  composerPhase?: ComposerDecisionPhase | null;
}): ExecutionDecisionKind {
  const parts: ExecutionDecisionKind[] = [];
  if (input.composerPhase) {
    parts.push(decideComposerExecution(input.composerPhase));
  }
  if (input.node) {
    parts.push(decideNodeExecution(input.node));
  }
  if (input.slotId) {
    parts.push(decideSlotExecution(input.slotId));
  }
  if (input.risk) {
    parts.push(decideRiskOperation(input.risk));
  }
  return mergeExecutionDecision(...parts);
}
