/**
 * Context NL action result — shared by pipeline runner + thin entry wrappers.
 */

import type { ActionPlannerRunResult } from "@/lib/action-planner/types";
import type { ContextPackV1 } from "@/lib/context-builder";
import type { GraphCommandApplyResult } from "@/lib/graph-command/types";
import type { RuleEngineDecision } from "@/lib/rule-engine";

export type ContextNlActionResult =
  | (GraphCommandApplyResult & {
      readonly via: "graph_command";
      /** Phase D: short ToolId plan preview (Search turns). */
      readonly actionPlan?: ActionPlannerRunResult["plan"];
      readonly ruleDecision?: RuleEngineDecision;
      readonly contextPack?: ContextPackV1;
      /** True when reserve_prep / COMMIT_REQUIRED left ops in Field queue. */
      readonly waitingCommit?: boolean;
    })
  | {
      readonly ok: true;
      readonly via: "action_plan";
      readonly contextEventId: string;
      readonly assistantReplyKo: string;
      readonly reservedOpIds: readonly string[];
      readonly actionPlan: ActionPlannerRunResult["plan"];
      /** True only when Reserve/Purchase prep needs Field Commit. */
      readonly waitingCommit: boolean;
      readonly ruleDecision?: RuleEngineDecision;
      readonly contextPack?: ContextPackV1;
    }
  | {
      readonly ok: true;
      readonly via: "soft_command";
      readonly contextEventId: string;
      readonly assistantReplyKo: string;
      readonly reservedOpIds: readonly string[];
      readonly waitingCommit: boolean;
      readonly mapsUrl: string | null;
      readonly softKind: "navigate" | "calendar";
      readonly ruleDecision?: RuleEngineDecision;
      readonly contextPack?: ContextPackV1;
    }
  | {
      readonly ok: true;
      readonly via: "revise_confirm";
      readonly contextEventId: string;
      readonly assistantReplyKo: string;
      readonly reservedOpIds: readonly [];
      readonly waitingCommit: false;
      readonly reviseChips: readonly {
        readonly id: string;
        readonly labelKo: string;
        readonly gapId: string;
        readonly value: string;
      }[];
      readonly ruleDecision?: RuleEngineDecision;
      readonly contextPack?: ContextPackV1;
    }
  | {
      /** Stay/guest slots written — Globe Diff re-scout only (skipFeedGate). */
      readonly ok: true;
      readonly via: "revise_applied";
      readonly contextEventId: string;
      readonly assistantReplyKo: string;
      readonly reservedOpIds: readonly [];
      readonly waitingCommit: false;
      readonly requestDiffRescout: true;
      readonly skipFeedGate: true;
      readonly ruleDecision?: RuleEngineDecision;
      readonly contextPack?: ContextPackV1;
    }
  | {
      readonly ok: true;
      readonly via: "workspace";
      readonly contextEventId: string;
      readonly assistantReplyKo: string;
      readonly reservedOpIds: readonly [];
      readonly waitingCommit: false;
      readonly workspaceCommitted: boolean;
      readonly ruleDecision?: RuleEngineDecision;
      readonly contextPack?: ContextPackV1;
    }
  | {
      readonly ok: true;
      readonly via: "soft_confirm";
      readonly contextEventId: string;
      readonly assistantReplyKo: string;
      readonly reservedOpIds: readonly [];
      readonly waitingCommit: false;
      readonly softConfirmKind: "filter" | "pin" | "delete" | "share";
      readonly softConfirmChips: readonly {
        readonly id: string;
        readonly labelKo: string;
        readonly gapId: string;
        readonly value: string;
      }[];
      readonly ruleDecision?: RuleEngineDecision;
      readonly contextPack?: ContextPackV1;
    }
  | {
      readonly ok: true;
      readonly via: "clarify";
      readonly contextEventId: string;
      readonly assistantReplyKo: string;
      readonly reservedOpIds: readonly [];
      readonly waitingCommit: false;
      readonly ruleDecision: RuleEngineDecision;
      readonly contextPack: ContextPackV1;
      /** ClarifyLess 1-chip set — pick resumes same turn pipeline. */
      readonly clarifyChips?: readonly {
        readonly id: string;
        readonly labelKo: string;
        readonly gapId: string;
        readonly value: string;
      }[];
    }
  | {
      /** Reason-Later — unmatched Analyze/Unknown; chips still required (no silent). */
      readonly ok: true;
      readonly via: "reason";
      readonly contextEventId: string;
      readonly assistantReplyKo: string;
      readonly reservedOpIds: readonly [];
      readonly waitingCommit: false;
      readonly ruleDecision: RuleEngineDecision;
      readonly contextPack: ContextPackV1;
      readonly clarifyChips: readonly {
        readonly id: string;
        readonly labelKo: string;
        readonly gapId: string;
        readonly value: string;
      }[];
    }
  | {
      /** NL defers Field discovery — Operator/pin-bar MUST continue scout. */
      readonly ok: true;
      readonly via: "scout_handoff";
      readonly contextEventId: string;
      readonly assistantReplyKo: string;
      readonly reservedOpIds: readonly [];
      readonly waitingCommit: false;
      readonly ruleDecision: RuleEngineDecision;
      readonly contextPack: ContextPackV1;
      readonly handoffKind: "discovery_scout";
      /** Phase D: short plan chips while scout runs. */
      readonly actionPlan?: ActionPlannerRunResult["plan"];
    }
  | {
      readonly ok: true;
      readonly via: "rule_blocked";
      readonly contextEventId: string;
      readonly assistantReplyKo: string;
      readonly reservedOpIds: readonly [];
      readonly waitingCommit: false;
      readonly ruleDecision: RuleEngineDecision;
      readonly contextPack: ContextPackV1;
    };
