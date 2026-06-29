import {
  decideNodeExecution,
  decideRunTurn,
  type ComposerDecisionPhase,
  type RiskOperation,
  type RunGraphNodeId,
  type SlotId,
} from "@/lib/context-run/execution-decision";
import { isCommitPermitted } from "@/lib/context-run/commit-gate";
import type {
  ContextRunSurfaceKind,
  ContextRunSurfaceResolution,
  ExecutionDecisionKind,
} from "@/lib/context-run/types";

export type RunGraphNode = {
  id: RunGraphNodeId;
  eventId?: string | null;
};

export type SurfaceEffectKind =
  | "none"
  | "open_portal"
  | "open_field_discovery"
  | "map_focus"
  | "open_approval"
  | "show_question"
  | "show_progress"
  | "show_result"
  | "dashboard_highlight";

export type ContextRunSurfaceResolutionFull = ContextRunSurfaceResolution & {
  effect: SurfaceEffectKind;
  commitPermitted: boolean;
  primaryOnly: true;
};

const NODE_SURFACE: Record<RunGraphNodeId, ContextRunSurfaceKind> = {
  slot_media: "execution_card",
  slot_price: "question_card",
  slot_place: "question_card",
  approval_publish: "approval_dialog",
  approval_pay: "approval_dialog",
  approval_handshake: "approval_dialog",
  match_running: "progress",
  match_done: "field_discovery_ingress",
  lodging_done: "map_focus",
  multi_run_overview: "dashboard_highlight",
};

const COMPOSER_SURFACE: Record<ComposerDecisionPhase, ContextRunSurfaceKind> = {
  market_bare: "portal",
  market_compose: "portal",
  market_supply_pass: "portal",
  discovery_market_hint: "field_discovery_ingress",
  text_committed: "map_focus",
};

/** Decision → allowed surface kinds (G3 — one primary per turn). */
const SURFACES_BY_DECISION: Record<
  ExecutionDecisionKind,
  readonly ContextRunSurfaceKind[]
> = {
  ask: ["question_card", "execution_card", "portal"],
  approval_required: ["approval_dialog"],
  recommend: [
    "portal",
    "field_discovery_ingress",
    "execution_card",
    "hub_peek",
  ],
  auto: [
    "map_focus",
    "progress",
    "toast_only",
    "execution_card",
    "dashboard_highlight",
  ],
};

const NODE_EFFECT: Record<RunGraphNodeId, SurfaceEffectKind> = {
  slot_media: "show_question",
  slot_price: "show_question",
  slot_place: "show_question",
  approval_publish: "open_approval",
  approval_pay: "open_approval",
  approval_handshake: "open_approval",
  match_running: "show_progress",
  match_done: "open_field_discovery",
  lodging_done: "map_focus",
  multi_run_overview: "dashboard_highlight",
};

const COMPOSER_EFFECT: Record<ComposerDecisionPhase, SurfaceEffectKind> = {
  market_bare: "open_portal",
  market_compose: "open_portal",
  market_supply_pass: "open_portal",
  discovery_market_hint: "open_field_discovery",
  text_committed: "map_focus",
};

const SURFACE_TO_RISK: Partial<Record<ContextRunSurfaceKind, RiskOperation>> = {
  portal: "none",
  field_discovery_ingress: "none",
  map_focus: "none",
  approval_dialog: "publish_external",
};

export function surfacesAllowedForDecision(
  decision: ExecutionDecisionKind,
): readonly ContextRunSurfaceKind[] {
  return SURFACES_BY_DECISION[decision];
}

/** PR gate — surface must match Decision (G10). */
export function assertSurfaceMatchesDecision(input: {
  decision: ExecutionDecisionKind;
  surface: ContextRunSurfaceKind;
}): void {
  const allowed = SURFACES_BY_DECISION[input.decision];
  if (!allowed.includes(input.surface)) {
    throw new Error(
      `Surface ${input.surface} not allowed for decision ${input.decision}`,
    );
  }
}

/**
 * Post-Question, pre-Commit — pick exactly one primary surface (G3).
 */
export function resolvePrimarySurface(input: {
  graphId: string;
  node?: RunGraphNode | null;
  composerPhase?: ComposerDecisionPhase | null;
  slotId?: SlotId | null;
  risk?: RiskOperation;
  approvalGranted?: boolean;
}): ContextRunSurfaceResolutionFull {
  const decision = decideRunTurn({
    node: input.node?.id ?? null,
    slotId: input.slotId ?? null,
    risk: input.risk ?? "none",
    composerPhase: input.composerPhase ?? null,
  });

  let surface: ContextRunSurfaceKind = "toast_only";
  let effect: SurfaceEffectKind = "none";
  let reason = "default";

  if (input.composerPhase) {
    surface = COMPOSER_SURFACE[input.composerPhase];
    effect = COMPOSER_EFFECT[input.composerPhase];
    reason = `composer:${input.composerPhase}`;
  } else if (input.node) {
    surface = NODE_SURFACE[input.node.id];
    effect = NODE_EFFECT[input.node.id];
    reason = `node:${input.node.id}`;
  }

  if (decision === "approval_required") {
    surface = "approval_dialog";
    effect = "open_approval";
    reason = `${reason}:approval`;
  } else if (decision === "ask" && input.slotId) {
    surface = "question_card";
    effect = "show_question";
    reason = `slot:${input.slotId}`;
  }

  assertSurfaceMatchesDecision({ decision, surface });

  const risk =
    input.risk ??
    SURFACE_TO_RISK[surface] ??
    (decision === "approval_required" ? "publish_external" : "none");

  return {
    graphId: input.graphId,
    decision,
    surface,
    reason,
    effect,
    commitPermitted: isCommitPermitted({
      risk,
      approvalGranted: input.approvalGranted,
    }),
    primaryOnly: true,
  };
}

/** @deprecated — use resolvePrimarySurface */
export function resolveExecutionSurface(input: {
  graphId: string;
  node: RunGraphNode;
  decision?: ExecutionDecisionKind;
}): ContextRunSurfaceResolution {
  const resolution = resolvePrimarySurface({
    graphId: input.graphId,
    node: input.node,
  });
  return {
    graphId: resolution.graphId,
    decision: input.decision ?? resolution.decision,
    surface: resolution.surface,
    reason: resolution.reason,
  };
}
