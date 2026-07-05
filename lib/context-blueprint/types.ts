import type { CapabilityGraph } from "@/lib/context-blueprint/capability-graph";
import type { ExecutionGraph } from "@/lib/context-blueprint/execution-graph";
import type { ResourcePlan } from "@/lib/context-blueprint/resource-plan";
import { composeResourcePlan } from "@/lib/context-blueprint/resource-plan";
import type { ExecutionSpace } from "@/lib/context-blueprint/spatial-plan";
import type { SpatialTargets } from "@/lib/context-blueprint/spatial-targets";
import type { TemporalPlan } from "@/lib/context-blueprint/temporal-plan";
import type { TemporalTargets } from "@/lib/context-blueprint/temporal-targets";
import { composeTemporalPlan } from "@/lib/context-blueprint/temporal-plan";
import { composeDefaultBridgeId } from "@/lib/context-os/vocabulary-v2";
import { composeContainerRuntimeId } from "@/lib/container-runtime/types";
import {
  CONTEXT_BLUEPRINT_CONTRACT_VERSION,
  type ContextBlueprintApprovalPolicy,
  type ContextBlueprintCreatedBy,
  type ContextBlueprintPriority,
  type ContextContainerKind,
  type ContextResourceKind,
  type DomainExecutorId,
} from "@/lib/context-blueprint/blueprint-constants";
import type {
  ContextBlueprintConstraints,
  PersonalContextRef,
} from "@/lib/context-blueprint/wire-fields";
import type {
  ContextBlueprintKnownTruth,
  ContextBlueprintNextQuestion,
  ContextBlueprintPeriod,
} from "@/lib/context-blueprint/wire-fields";

export type {
  ContextBlueprintConstraints,
  ContextBlueprintDestination,
  ContextBlueprintKnownTruth,
  ContextBlueprintNextQuestion,
  ContextBlueprintParticipant,
  ContextBlueprintPeriod,
  PersonalContextRef,
} from "@/lib/context-blueprint/wire-fields";

export type {
  ContextBlueprintApprovalPolicy,
  ContextBlueprintCreatedBy,
  ContextBlueprintPriority,
  ContextContainerKind,
  ContextResourceKind,
  DomainExecutorId,
} from "@/lib/context-blueprint/blueprint-constants";

export {
  CONTEXT_BLUEPRINT_APPROVAL_POLICIES,
  CONTEXT_BLUEPRINT_CONTRACT_VERSION,
  CONTEXT_BLUEPRINT_CREATORS,
  CONTEXT_BLUEPRINT_PRIORITIES,
  CONTEXT_CONTAINER_KINDS,
  CONTEXT_RESOURCE_KINDS,
  DOMAIN_EXECUTOR_IDS,
} from "@/lib/context-blueprint/blueprint-constants";

export type ContextBlueprintExecutionScope = {
  readonly radiusKm?: number | null;
  readonly allowedExecutors: readonly DomainExecutorId[];
  readonly allowedResources: readonly ContextResourceKind[];
};

/**
 * L2 SSOT — Process specification on Container runtime (NOT on Bridge).
 * Bridge = File (memory). Container = Process. ExecutionGraph lives here only.
 * @see docs/RIMVIO_CANONICAL_VOCABULARY_V2.md
 */
export type ContextBlueprint = {
  readonly contractVersion: typeof CONTEXT_BLUEPRINT_CONTRACT_VERSION;
  readonly id: string;
  readonly version: number;
  /** Context — SSOT meaning unit id (Globe node). */
  readonly contextId: string;
  /** Bridge — memory graph identity linking Contexts. */
  readonly bridgeId: string;
  /** Runtime — Process session id. */
  readonly runtimeId: string;
  /** @deprecated Prefer runtimeId */
  readonly ownerContext: string;
  /** Intent — user goal headline. */
  readonly goal: string;
  readonly priority: ContextBlueprintPriority;
  readonly containerKind: ContextContainerKind;
  readonly personalContext: PersonalContextRef | null;
  /** Execution Graph — OS center. Nodes carry Resources + Actions. */
  readonly executionGraph: ExecutionGraph | null;
  /** Spatial Targets — WHERE per execution node (attribute, not root). */
  readonly spatialTargets: SpatialTargets | null;
  /** Temporal Targets — WHEN per execution node. */
  readonly temporalTargets: TemporalTargets | null;
  /** Resources — gaps · truth · nextQuestion (rollup; node resourceKinds are SSOT per step). */
  readonly resourcePlan: ResourcePlan;
  /** Executors — allowed domain AIs + scope. */
  readonly assignedExecutors: readonly DomainExecutorId[];
  readonly executionScope: ContextBlueprintExecutionScope;
  readonly approvalPolicy: ContextBlueprintApprovalPolicy;
  /** @deprecated Method 1 — prefer executionGraph + spatialTargets */
  readonly capabilityGraph: CapabilityGraph | null;
  /** @deprecated Travel MVP map projection — derive from spatialTargets when possible */
  readonly spatialPlan: ExecutionSpace | null;
  /** @deprecated Prefer temporalTargets per node; kept for period rollup */
  readonly temporalPlan: TemporalPlan | null;
  readonly constraints: ContextBlueprintConstraints;
  readonly createdBy: ContextBlueprintCreatedBy;
  readonly createdAt: string;
  readonly readOnly: true;
};

export type ComposeContextBlueprintInput = {
  contextId: string;
  bridgeId?: string;
  runtimeId?: string;
  /** @deprecated use contextId */
  ownerContext?: string;
  goal: string;
  containerKind: ContextContainerKind;
  priority?: ContextBlueprintPriority;
  personalContext?: PersonalContextRef | null;
  executionGraph?: ExecutionGraph | null;
  spatialTargets?: SpatialTargets | null;
  temporalTargets?: TemporalTargets | null;
  capabilityGraph?: CapabilityGraph | null;
  spatialPlan?: ExecutionSpace | null;
  temporalPlan?: TemporalPlan | null;
  resourcePlan?: ResourcePlan;
  constraints?: Partial<ContextBlueprintConstraints>;
  /** @deprecated Prefer resourcePlan.requiredResources */
  requiredResources?: readonly ContextResourceKind[];
  /** @deprecated Prefer resourcePlan.knownTruth */
  knownTruth?: readonly ContextBlueprintKnownTruth[];
  /** @deprecated Prefer resourcePlan.emptySlots */
  emptySlots?: readonly string[];
  /** @deprecated Prefer resourcePlan.nextQuestion */
  nextQuestion?: ContextBlueprintNextQuestion | null;
  assignedExecutors?: readonly DomainExecutorId[];
  executionScope?: Partial<ContextBlueprintExecutionScope>;
  approvalPolicy?: ContextBlueprintApprovalPolicy;
  createdBy?: ContextBlueprintCreatedBy;
  blueprintVersion?: number;
  now?: Date;
};

function buildConstraints(
  input: ComposeContextBlueprintInput,
): ContextBlueprintConstraints {
  const partial = input.constraints ?? {};
  return {
    destination: partial.destination ?? null,
    period: partial.period ?? null,
    participants: [...(partial.participants ?? [])],
    budgetBand: partial.budgetBand ?? null,
    companionMode: partial.companionMode ?? null,
  };
}

function buildExecutionScope(input: {
  assignedExecutors: readonly DomainExecutorId[];
  resourcePlan: ResourcePlan;
  executionScope?: Partial<ContextBlueprintExecutionScope>;
}): ContextBlueprintExecutionScope {
  return {
    radiusKm: input.executionScope?.radiusKm ?? 3,
    allowedExecutors:
      input.executionScope?.allowedExecutors ?? [...input.assignedExecutors],
    allowedResources:
      input.executionScope?.allowedResources ??
      [...input.resourcePlan.requiredResources],
  };
}

function buildResourcePlan(input: ComposeContextBlueprintInput): ResourcePlan {
  if (input.resourcePlan) {
    return input.resourcePlan;
  }
  return composeResourcePlan({
    requiredResources: input.requiredResources,
    knownTruth: input.knownTruth,
    emptySlots: input.emptySlots,
    nextQuestion: input.nextQuestion,
  });
}

function buildTemporalPlan(input: {
  temporalPlan?: TemporalPlan | null;
  constraints: ContextBlueprintConstraints;
}): TemporalPlan | null {
  if (input.temporalPlan !== undefined) {
    return input.temporalPlan;
  }
  if (!input.constraints.period) {
    return null;
  }
  return composeTemporalPlan({
    period: input.constraints.period,
    timezone: input.constraints.period.timezone ?? null,
  });
}

/** L1 composes immutable Blueprint — no side effects, no API calls, no hotel search. */
export function composeContextBlueprint(
  input: ComposeContextBlueprintInput,
): ContextBlueprint {
  const now = input.now ?? new Date();
  const contextId = (input.contextId ?? input.ownerContext ?? "").trim();
  if (!contextId) {
    throw new Error("[ContextBlueprint] contextId required");
  }
  const resolvedBridgeId = input.bridgeId?.trim() || composeDefaultBridgeId(contextId);
  const runtimeId = input.runtimeId?.trim() || composeContainerRuntimeId(contextId, now);
  const assignedExecutors = [...(input.assignedExecutors ?? [])];
  const constraints = buildConstraints(input);
  const resourcePlan = buildResourcePlan(input);
  const temporalPlan = buildTemporalPlan({
    temporalPlan: input.temporalPlan,
    constraints,
  });

  return {
    contractVersion: CONTEXT_BLUEPRINT_CONTRACT_VERSION,
    id: `cb-${runtimeId}-${now.getTime()}`,
    version: input.blueprintVersion ?? 1,
    bridgeId: resolvedBridgeId,
    contextId,
    runtimeId,
    ownerContext: runtimeId,
    goal: input.goal.trim(),
    priority: input.priority ?? "normal",
    containerKind: input.containerKind,
    personalContext: input.personalContext ?? null,
    executionGraph: input.executionGraph ?? null,
    spatialTargets: input.spatialTargets ?? null,
    temporalTargets: input.temporalTargets ?? null,
    resourcePlan,
    assignedExecutors,
    executionScope: buildExecutionScope({
      assignedExecutors,
      resourcePlan,
      executionScope: input.executionScope,
    }),
    approvalPolicy: input.approvalPolicy ?? "manual",
    capabilityGraph: input.capabilityGraph ?? null,
    spatialPlan: input.spatialPlan ?? null,
    temporalPlan,
    constraints,
    createdBy: input.createdBy ?? "globe_ai",
    createdAt: now.toISOString(),
    readOnly: true,
  };
}

/** @deprecated Use resourcePlan.knownTruth */
export type ContextBlueprintSlotWire = ContextBlueprintKnownTruth;

export function readBlueprintContextId(blueprint: ContextBlueprint): string {
  return blueprint.contextId;
}

export function readBlueprintBridgeId(blueprint: ContextBlueprint): string {
  return blueprint.bridgeId;
}

export function readBlueprintRuntimeId(blueprint: ContextBlueprint): string {
  return blueprint.runtimeId;
}

/** @deprecated Prefer readBlueprintRuntimeId */
export function readBlueprintContainerEventId(
  blueprint: ContextBlueprint,
): string {
  return blueprint.runtimeId;
}

/** Convenience accessors for sub-contracts. */
export function readBlueprintRequiredResources(
  blueprint: ContextBlueprint,
): readonly ContextResourceKind[] {
  return blueprint.resourcePlan.requiredResources;
}

export function readBlueprintEmptySlots(
  blueprint: ContextBlueprint,
): readonly string[] {
  return blueprint.resourcePlan.emptySlots;
}

export function readBlueprintNextQuestion(
  blueprint: ContextBlueprint,
): ContextBlueprintNextQuestion | null {
  return blueprint.resourcePlan.nextQuestion;
}
