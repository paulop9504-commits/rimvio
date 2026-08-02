/**
 * Reality OS Layer types + cross-layer interfaces.
 *
 * These are Architecture Foundation contracts.
 * Wire implementations live in existing modules (do not delete / replace them):
 *
 *   globe          → lib/globe-ingress · Reality Surface
 *   context        → lib/context-blueprint · lib/context-workspace
 *   reality_graph  → lib/reality-graph · lib/reality-object
 *   workspace      → lib/workspace · lib/workspace-command
 *   agent          → lib/workspace-agent
 *   draft          → lib/workspace-command (DraftMutation)
 *   simulation     → lib/simulation-engine
 *   prepare        → lib/prepare-layer
 *   commit         → lib/reality-commit
 */

import type { RealityOsLayerId } from "@/lib/reality-os/constitution";
import { REALITY_OS_LAYERS } from "@/lib/reality-os/constitution";

export type { RealityOsLayerId };
export { REALITY_OS_LAYERS };

/** Canonical module path for each layer (documentation + runtime resolve). */
export const REALITY_OS_LAYER_MODULES: Readonly<
  Record<RealityOsLayerId, readonly string[]>
> = {
  globe: ["lib/globe-ingress", "lib/reality-surface", "app/(globe)"],
  context: ["lib/context-blueprint", "lib/context-workspace", "lib/context-run"],
  reality_graph: ["lib/reality-graph", "lib/reality-object"],
  workspace: ["lib/workspace", "lib/workspace-command", "lib/workspace-sdk"],
  agent: ["lib/workspace-agent"],
  draft: ["lib/workspace-command"],
  simulation: ["lib/simulation-engine", "lib/callout/simulation"],
  prepare: ["lib/prepare-layer", "lib/callout/prepare"],
  commit: ["lib/reality-commit", "lib/callout/commit-boundary"],
};

// ─── Layer-facing handles (interfaces only — no I/O) ───────────────

export type RealityOsGlobeView = {
  readonly layer: "globe";
  readonly contextId: string;
  /** Projection / capsule pins — never a live street editor */
  readonly viewOnly: true;
};

export type RealityOsContextHandle = {
  readonly layer: "context";
  readonly contextId: string;
  readonly blueprintId: string | null;
  readonly goalKo: string | null;
};

export type RealityOsGraphHandle = {
  readonly layer: "reality_graph";
  readonly entityIds: readonly string[];
  /** Graph is SSOT for entities; Workspace holds references only */
  readonly ssot: true;
};

export type RealityOsWorkspaceHandle = {
  readonly layer: "workspace";
  readonly workspaceId: string;
  readonly contextId: string;
  /** Editor instance — Draft mutations land here first */
  readonly editor: true;
};

export type RealityOsAgentHandle = {
  readonly layer: "agent";
  readonly workspaceId: string;
  readonly draftOnly: true;
  readonly mayCommit: false;
};

export type RealityOsDraftHandle = {
  readonly layer: "draft";
  readonly draftId: string;
  readonly workspaceId: string;
  readonly status: "proposed" | "applied" | "rejected";
};

export type RealityOsSimulationHandle = {
  readonly layer: "simulation";
  readonly simulationId: string;
  readonly status: "SIMULATION_ONLY";
  readonly mayMutateReality: false;
};

export type RealityOsPrepareHandle = {
  readonly layer: "prepare";
  readonly prepareId: string;
  readonly entityId: string;
  readonly status: "ready_for_commit";
  readonly executed: false;
};

export type RealityOsCommitHandle = {
  readonly layer: "commit";
  readonly transactionId: string;
  readonly actor: "user";
  readonly ledgerEntryId: string;
};

export type RealityOsLayerHandle =
  | RealityOsGlobeView
  | RealityOsContextHandle
  | RealityOsGraphHandle
  | RealityOsWorkspaceHandle
  | RealityOsAgentHandle
  | RealityOsDraftHandle
  | RealityOsSimulationHandle
  | RealityOsPrepareHandle
  | RealityOsCommitHandle;

// ─── Interfaces between layers ─────────────────────────────────────

/**
 * Intent (Globe / Context) → Workspace open.
 * Context never mutates Reality.
 */
export type ContextToWorkspaceInterface = {
  readonly from: "context";
  readonly to: "workspace";
  readonly contextId: string;
  readonly openWorkspace: true;
  readonly mutateReality: false;
};

/**
 * Workspace ↔ Reality Graph — reference only (entityId), no payload fork as SSOT.
 */
export type WorkspaceToGraphInterface = {
  readonly from: "workspace";
  readonly to: "reality_graph";
  readonly entityRefs: readonly string[];
  readonly forkEntityPayloadForbidden: true;
};

/**
 * Agent → Draft — proposals only.
 */
export type AgentToDraftInterface = {
  readonly from: "agent";
  readonly to: "draft";
  readonly workspaceId: string;
  readonly draftId: string;
  readonly mayCommit: false;
};

/**
 * Draft → Simulation — predict before Apply / Prepare.
 */
export type DraftToSimulationInterface = {
  readonly from: "draft" | "workspace" | "agent";
  readonly to: "simulation";
  readonly status: "SIMULATION_ONLY";
  readonly mutateReality: false;
};

/**
 * Prepare → Commit Review — waiting for human.
 */
export type PrepareToCommitInterface = {
  readonly from: "prepare";
  readonly to: "commit";
  readonly prepareId: string;
  readonly status: "ready_for_commit";
  readonly requiresUserApproval: true;
};

/**
 * Commit → Reality Graph + Globe View update (Ledger recorded).
 */
export type CommitToRealityInterface = {
  readonly from: "commit";
  readonly to: "reality_graph";
  readonly transactionId: string;
  readonly actor: "user";
  readonly ledgerRequired: true;
};

/**
 * Globe ← Reality — read-only projection after Commit / graph change.
 */
export type RealityToGlobeInterface = {
  readonly from: "reality_graph" | "commit";
  readonly to: "globe";
  readonly viewOnly: true;
  readonly editor: false;
};

export type RealityOsLayerInterface =
  | ContextToWorkspaceInterface
  | WorkspaceToGraphInterface
  | AgentToDraftInterface
  | DraftToSimulationInterface
  | PrepareToCommitInterface
  | CommitToRealityInterface
  | RealityToGlobeInterface;

/** Canonical loop (same as E2E). */
export const REALITY_OS_LOOP = [
  "user_intent",
  "context_understanding",
  "workspace",
  "reality_graph",
  "agent",
  "draft",
  "simulation",
  "prepare",
  "human_commit",
  "reality_ledger",
] as const;

export type RealityOsLoopStage = (typeof REALITY_OS_LOOP)[number];
