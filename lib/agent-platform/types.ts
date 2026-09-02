/**
 * Agent Platform — unified Publish → Registry → Invoke types.
 * One spine for Hub Dev Agent + Main Agent capability execution.
 */

import type { CapabilityIndexEntry } from "@/lib/platform-sdk/capability-index";

export type CapabilityRuntimeKind =
  | "browser"
  | "workspace"
  | "api"
  | "graph"
  | "composite"
  | "prepare-only";

export type AgentPlatformCapabilityDef = {
  readonly capabilityId: string;
  readonly label: string;
  readonly domain: string;
  readonly runtimeKind: CapabilityRuntimeKind;
  readonly inputSchema: string;
  readonly outputSchema: string;
  readonly approvalRequired: boolean;
  readonly category: string;
  readonly tags: readonly string[];
  readonly keywords: readonly string[];
  readonly platformId: string;
  readonly platformName: string;
  readonly routePath: string;
  readonly runnable: boolean;
};

export type PublishCapabilityInput = {
  readonly entry: CapabilityIndexEntry;
  readonly developerId?: string;
};

export type PublishCapabilityResult = {
  readonly ok: boolean;
  readonly entry?: CapabilityIndexEntry;
  readonly errorKo?: string;
  readonly indexSize: number;
};

export type InvokeCapabilityInput = {
  readonly capabilityId: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly userRequest?: string;
  readonly contextEventId?: string;
  readonly platformId?: string;
  readonly userId?: string | null;
  readonly projectId?: string | null;
  readonly parentExecutionId?: string | null;
  readonly skipApproval?: boolean;
  readonly syncGoal?: boolean;
  /** Enable Verify → Repair loop (default true for non-browser). */
  readonly toolLoop?: boolean;
  readonly maxRepairAttempts?: number;
  /** Browser sandbox: block until session reaches terminal lifecycle (composite loops). */
  readonly waitForSandbox?: boolean;
  readonly sandboxTimeoutMs?: number;
};

export type InvokeCapabilityResult = {
  readonly ok: boolean;
  readonly capabilityId: string;
  readonly executionId: string;
  readonly runtimeKind: CapabilityRuntimeKind;
  readonly output: Record<string, unknown> | null;
  readonly sandboxSessionId?: string | null;
  readonly latencyMs: number;
  readonly errorKo?: string;
  readonly prepareOnly?: boolean;
  readonly workLogKo: string;
  readonly goalPercent?: number;
  readonly verified?: boolean;
  readonly repaired?: boolean;
  readonly repairAttempts?: number;
};

export type OperatorTurnInput = {
  readonly utterance: string;
  readonly platformId: string;
  readonly contextEventId?: string;
  readonly autoExecute?: boolean;
};

export type OperatorTurnResult = {
  readonly ok: boolean;
  readonly contextEventId: string;
  readonly strategy: string;
  readonly goalKo: string;
  readonly capabilityId: string;
  readonly steps: readonly { readonly stage: string; readonly label: string; readonly done: boolean }[];
  readonly invoke?: InvokeCapabilityResult;
  readonly workLogKo: string;
};

export type PersistedGoalState = {
  readonly contextEventId: string;
  readonly goalKo: string;
  readonly goalId: string;
  readonly percent: number;
  readonly status: "active" | "blocked" | "awaiting_commit" | "complete";
  readonly pendingCapabilityIds: readonly string[];
  readonly completedCapabilityIds: readonly string[];
  readonly lastExecutionId: string | null;
  readonly utterance: string | null;
  readonly updatedAtIso: string;
  /** Composite loop resume — ordered pipeline SSOT. */
  readonly pipelineCapabilityIds?: readonly string[];
  readonly pipelineStepIndex?: number;
  readonly compositeLoopId?: string | null;
};

export type ToolLoopPhase =
  | "observe"
  | "plan"
  | "invoke"
  | "verify"
  | "repair"
  | "complete";

export type ToolLoopStepLog = {
  readonly phase: ToolLoopPhase;
  readonly capabilityId: string;
  readonly ok: boolean;
  readonly detailKo: string;
};

export type CompositeLoopStep = {
  readonly capabilityId: string;
  readonly input?: Readonly<Record<string, unknown>>;
  readonly labelKo?: string;
};

export type CompositeLoopDef = {
  readonly loopId: string;
  readonly goalKo: string;
  readonly steps: readonly CompositeLoopStep[];
};

export type CompositeLoopResult = {
  readonly ok: boolean;
  readonly loopId: string;
  readonly goalKo: string;
  readonly stepsCompleted: number;
  readonly totalSteps: number;
  readonly goalPercent: number;
  readonly logs: readonly ToolLoopStepLog[];
  readonly lastInvoke: InvokeCapabilityResult | null;
  readonly workLogKo: string;
};
