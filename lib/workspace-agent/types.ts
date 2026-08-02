/**
 * Workspace Reality Agent — types.
 * Operator scoped to Active Workspace only. Reality Commit forbidden.
 */

import type {
  DraftMutation,
  WorkspaceActionProposal,
  WorkspaceIntent,
} from "@/lib/workspace-command/types";
import type { SimulationResult } from "@/lib/simulation-engine";

export type WorkspaceAgentPhase =
  | "observe"
  | "read_context"
  | "understand_intent"
  | "plan"
  | "draft"
  | "validate"
  | "request_apply";

export type WorkspaceAgentPlanStep = {
  readonly id: string;
  readonly order: number;
  readonly labelKo: string;
  readonly kind:
    | "explore_alternatives"
    | "analyze_impact"
    | "create_draft"
    | "request_apply"
    | "observe_schedule"
    | "analyze_fatigue"
    | "alternative_plan";
};

export type WorkspaceAgentPlan = {
  readonly id: string;
  readonly summaryKo: string;
  readonly steps: readonly WorkspaceAgentPlanStep[];
  readonly intent: WorkspaceIntent;
};

export type WorkspaceAgentContext = {
  readonly workspaceId: string;
  readonly contextId: string;
  readonly contextTitleKo: string;
  readonly domain: string | null;
  readonly currentHotel: {
    readonly objectId: string;
    readonly entityId: string;
    readonly title: string;
    readonly priceLabelKo: string | null;
    readonly selected: boolean;
  } | null;
  readonly visibleHotelCount: number;
  readonly notesKo: readonly string[];
  readonly draftOnly: true;
};

export type WorkspaceAgentValidation = {
  readonly ok: boolean;
  readonly reasonKo: string;
  readonly impactSummaryKo: string | null;
  readonly realityCommitBlocked: true;
};

export type WorkspaceAgentResult =
  | {
      readonly ok: true;
      readonly phase: "request_apply";
      readonly context: WorkspaceAgentContext;
      readonly intent: WorkspaceIntent;
      readonly plan: WorkspaceAgentPlan;
      readonly proposal: WorkspaceActionProposal;
      readonly validation: WorkspaceAgentValidation;
      readonly summaryKo: string;
      /** Hotel Change Proposal (and similar) */
      readonly proposalKind: "hotel_change" | "context_modify" | "generic";
      /** SIMULATION_ONLY prediction — never Reality mutate */
      readonly simulation: SimulationResult | null;
    }
  | {
      readonly ok: false;
      readonly reasonKo: string;
      readonly inactiveWorkspace: boolean;
      readonly realityCommitAttempted: boolean;
    };
