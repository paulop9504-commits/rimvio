/**
 * Object Scoped Prompt — ask the object, never a general ChatGPT essay.
 *
 * Object Context + User Intent
 *   → Context AI (scoped)
 *   → Simulation
 *   → Prepare
 */

import type { RimvioObject, RimvioObjectType } from "@/lib/callout/types";
import type { SimulationDraft } from "@/lib/callout/simulation/types";
import type { ReservationDraft } from "@/lib/callout/prepare/types";

export const OBJECT_SCOPED_PROMPT_STAGES = [
  "object_context",
  "user_intent",
  "context_ai",
  "simulation",
  "prepare",
] as const;

export type ObjectScopedPromptStage =
  (typeof OBJECT_SCOPED_PROMPT_STAGES)[number];

export type ObjectScopedIntentKind =
  | "change"
  | "simulate"
  | "prepare"
  | "compare"
  | "explore"
  | "clarify";

export type ObjectScopedIntent = {
  readonly kind: ObjectScopedIntentKind;
  readonly utterance: string;
  /** Soft preference axes inferred from utterance (never invent facts) */
  readonly axes: readonly string[];
  readonly labelKo: string;
};

export type ObjectScopedPromptRequest = {
  readonly object: RimvioObject;
  readonly utterance: string;
  readonly contextId: string;
};

export type ObjectScopedPromptResult = {
  readonly ok: true;
  readonly scope: {
    readonly objectId: string;
    readonly objectType: RimvioObjectType;
    readonly title: string;
  };
  readonly intent: ObjectScopedIntent;
  readonly stagesCompleted: readonly ObjectScopedPromptStage[];
  readonly replyKo: string;
  /** Workspace mutation hint — host applies; never Commit here */
  readonly workspaceHint: {
    readonly op:
      | "find_similar"
      | "simulate"
      | "compare"
      | "select"
      | "none";
    readonly simulateScenarioKo: string | null;
  };
  readonly shouldCreateSimulation: boolean;
  readonly shouldCreatePrepare: boolean;
  readonly simulationDraft: SimulationDraft | null;
  readonly reservationDraft: ReservationDraft | null;
};

export type ObjectScopedPromptReject = {
  readonly ok: false;
  readonly reasonKo: string;
  /** True when utterance tried to escape object scope into general chat */
  readonly escapedScope: boolean;
};
