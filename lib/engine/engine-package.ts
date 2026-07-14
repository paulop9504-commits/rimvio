/**
 * Rimvio Engine execution package — Goal · State · Policy · Workflow · Tool · Event · Memory · Capability.
 * @see docs/RIMVIO_ENGINE.md
 */

import type {
  ContextContainerKind,
  DomainExecutorId,
} from "@/lib/context-blueprint/blueprint-constants";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { RimvioEngineEventKind } from "@/lib/engine/engine-event-metadata";
import type {
  RimvioEngineGoal,
  RimvioEngineId,
  RimvioEnginePlan,
  RimvioEngineRunState,
  RimvioEngineTurnInput,
} from "@/lib/engine/engine-types";
import type { OperatorTurnPlan } from "@/lib/globe/operator-turn/types";

export const ENGINE_WORKFLOW_STEP_IDS = [
  "detect",
  "plan",
  "fill_slots",
  "scout",
  "select_main",
  "open_field",
  "await_approval",
  "commit",
] as const;

export type EngineWorkflowStepId = (typeof ENGINE_WORKFLOW_STEP_IDS)[number];

export type EngineWorkflowStep = {
  readonly id: EngineWorkflowStepId;
  readonly labelKo: string;
};

export type EnginePolicy = {
  /** L5 gate — user tap vs auto prep surface. */
  readonly approval: "user_tap" | "auto_prep";
  /** Operator may fill slots from chips without full intake sheet. */
  readonly expressSlotFill: boolean;
  /** Engine never commits Reality without human approval. */
  readonly requiresHumanCommit: boolean;
};

export type EngineToolBinding = {
  readonly kind: "operator" | "capability" | "scout";
  readonly id: string;
  readonly labelKo: string;
};

export type EngineEventKindBinding = {
  readonly kind: RimvioEngineEventKind;
  readonly labelKo: string;
  readonly workflowStep: EngineWorkflowStepId;
};

export type EngineMemorySlot = {
  readonly key: string;
  readonly scope: "engine" | "shared";
  readonly labelKo: string;
};

/** Static execution contract — installable Engine SKU manifest. */
export type RimvioEnginePackageManifest = {
  readonly id: RimvioEngineId;
  readonly executorId: DomainExecutorId;
  readonly containerKind: ContextContainerKind;
  readonly priority: number;
  readonly goal: RimvioEngineGoal;
  readonly policy: EnginePolicy;
  readonly workflow: readonly EngineWorkflowStep[];
  readonly tools: readonly EngineToolBinding[];
  readonly events: readonly EngineEventKindBinding[];
  readonly memory: readonly EngineMemorySlot[];
  readonly capabilities: readonly string[];
  readonly executionNodeIds: readonly string[];
};

export type RimvioEngineRuntime<TDomainPlan = unknown> = {
  readonly detect: (message: string) => boolean;
  readonly readState: (event: EventCandidate | null | undefined) => RimvioEngineRunState;
  readonly plan: (
    input: RimvioEngineTurnInput,
  ) => RimvioEnginePlan<TDomainPlan> | null;
  readonly toOperatorPlan: (
    plan: RimvioEnginePlan<TDomainPlan>,
  ) => OperatorTurnPlan | null;
};

/** Full L3 execution package — manifest + runtime hooks. */
export type RimvioEnginePackage<TDomainPlan = unknown> = RimvioEnginePackageManifest &
  RimvioEngineRuntime<TDomainPlan>;

export const STANDARD_ENGINE_WORKFLOW: readonly EngineWorkflowStep[] = [
  { id: "detect", labelKo: "맥락 감지" },
  { id: "plan", labelKo: "준비 계획" },
  { id: "fill_slots", labelKo: "조건 채우기" },
  { id: "scout", labelKo: "찾기" },
  { id: "select_main", labelKo: "고정" },
  { id: "open_field", labelKo: "맞춤 열기" },
  { id: "await_approval", labelKo: "확인 대기" },
  { id: "commit", labelKo: "확정" },
];

export const DEFAULT_ENGINE_POLICY: EnginePolicy = {
  approval: "user_tap",
  expressSlotFill: true,
  requiresHumanCommit: true,
};

export function standardEngineEventBindings(input: {
  scoutLabelKo: string;
  mainLabelKo: string;
}): readonly EngineEventKindBinding[] {
  return [
    {
      kind: "scout_complete",
      labelKo: input.scoutLabelKo,
      workflowStep: "scout",
    },
    {
      kind: "main_selected",
      labelKo: input.mainLabelKo,
      workflowStep: "select_main",
    },
  ];
}

function assertEnginePackage<TDomainPlan>(
  pkg: RimvioEnginePackage<TDomainPlan>,
): RimvioEnginePackage<TDomainPlan> {
  if (!pkg.goal.id.trim()) {
    throw new Error(`engine_package_missing_goal:${pkg.id}`);
  }
  if (pkg.workflow.length < 3) {
    throw new Error(`engine_package_workflow_too_short:${pkg.id}`);
  }
  if (pkg.tools.length < 1) {
    throw new Error(`engine_package_missing_tools:${pkg.id}`);
  }
  if (pkg.events.length < 1) {
    throw new Error(`engine_package_missing_events:${pkg.id}`);
  }
  if (pkg.memory.length < 1) {
    throw new Error(`engine_package_missing_memory:${pkg.id}`);
  }
  if (pkg.capabilities.length < 1) {
    throw new Error(`engine_package_missing_capabilities:${pkg.id}`);
  }
  if (pkg.executionNodeIds.length < 1) {
    throw new Error(`engine_package_missing_execution_nodes:${pkg.id}`);
  }
  return pkg;
}

/** Register a validated execution package (SSOT for registry). */
export function defineRimvioEnginePackage<TDomainPlan>(
  pkg: RimvioEnginePackage<TDomainPlan>,
): RimvioEnginePackage<TDomainPlan> {
  return assertEnginePackage(pkg);
}
