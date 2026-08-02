/**
 * Reality OS Runtime — Architecture Foundation facade.
 *
 * Does NOT replace existing engines. Resolves layers → modules,
 * validates transitions, and exposes constitution checks for hosts.
 *
 * Loop:
 *   User Intent → Context → Workspace → Reality Graph → Agent
 *   → Draft → Simulation → Prepare → Human Commit → Ledger
 */

import {
  assertAiCannotCommit,
  assertCommitRequiresUserApproval,
  assertNoDirectRealityMutation,
  REALITY_OS_LAYER_AUTHORITY,
  REALITY_OS_LAYERS,
  REALITY_OS_PRINCIPLES,
  REALITY_OS_PRODUCT_IDENTITY,
  type RealityOsLayerId,
} from "@/lib/reality-os/constitution";
import {
  emitRealityOsEvent,
  makeRealityOsEventBase,
} from "@/lib/reality-os/events";
import {
  REALITY_OS_LAYER_MODULES,
  REALITY_OS_LOOP,
  type AgentToDraftInterface,
  type CommitToRealityInterface,
  type ContextToWorkspaceInterface,
  type PrepareToCommitInterface,
  type RealityOsLayerInterface,
  type RealityToGlobeInterface,
  type WorkspaceToGraphInterface,
} from "@/lib/reality-os/types";

export type RealityOsArchitectureSnapshot = {
  readonly identity: typeof REALITY_OS_PRODUCT_IDENTITY;
  readonly principles: typeof REALITY_OS_PRINCIPLES;
  readonly layers: readonly RealityOsLayerId[];
  readonly loop: typeof REALITY_OS_LOOP;
  readonly modules: typeof REALITY_OS_LAYER_MODULES;
  readonly authority: typeof REALITY_OS_LAYER_AUTHORITY;
};

/** Describe the Architecture Foundation (for tests / docs / host). */
export function describeRealityOsArchitecture(): RealityOsArchitectureSnapshot {
  return {
    identity: REALITY_OS_PRODUCT_IDENTITY,
    principles: REALITY_OS_PRINCIPLES,
    layers: REALITY_OS_LAYERS,
    loop: REALITY_OS_LOOP,
    modules: REALITY_OS_LAYER_MODULES,
    authority: REALITY_OS_LAYER_AUTHORITY,
  };
}

export function resolveRealityOsModules(
  layer: RealityOsLayerId,
): readonly string[] {
  return REALITY_OS_LAYER_MODULES[layer];
}

/**
 * Allowed layer handoffs (constitution-aware).
 * Returns false when a layer tries to Commit or mutate Reality illegally.
 */
export function canTransitionRealityOsLayer(
  from: RealityOsLayerId,
  to: RealityOsLayerId,
): boolean {
  const fromAuth = REALITY_OS_LAYER_AUTHORITY[from];
  const toAuth = REALITY_OS_LAYER_AUTHORITY[to];

  // Nothing except commit may claim Reality mutation as destination effect
  if (to === "commit" && from === "agent") return false;
  if (to === "commit" && from === "simulation") return false;
  if (to === "commit" && from === "globe") return false;

  // Globe never receives editor writes
  if (to === "globe" && fromAuth.mayMutateWorkspaceDraft && from !== "commit") {
    // Draft/apply projects to globe via projection — allowed as view refresh only
    return true;
  }

  // Prepare → Commit is the human gate path
  if (from === "prepare" && to === "commit") return true;

  // Simulation never writes Reality
  if (from === "simulation" && toAuth.mayMutateReality) return false;

  return true;
}

export function validateRealityOsTransition(input: {
  readonly from: RealityOsLayerId;
  readonly to: RealityOsLayerId;
}): { readonly ok: true } | { readonly ok: false; readonly reasonKo: string } {
  if (!canTransitionRealityOsLayer(input.from, input.to)) {
    return {
      ok: false,
      reasonKo: `Reality OS 전이 거부 · ${input.from} → ${input.to}`,
    };
  }
  return { ok: true };
}

/** Build typed interface payloads for common handoffs. */
export function buildContextToWorkspaceInterface(input: {
  readonly contextId: string;
}): ContextToWorkspaceInterface {
  return {
    from: "context",
    to: "workspace",
    contextId: input.contextId,
    openWorkspace: true,
    mutateReality: false,
  };
}

export function buildWorkspaceToGraphInterface(input: {
  readonly entityRefs: readonly string[];
}): WorkspaceToGraphInterface {
  return {
    from: "workspace",
    to: "reality_graph",
    entityRefs: input.entityRefs,
    forkEntityPayloadForbidden: true,
  };
}

export function buildAgentToDraftInterface(input: {
  readonly workspaceId: string;
  readonly draftId: string;
}): AgentToDraftInterface {
  return {
    from: "agent",
    to: "draft",
    workspaceId: input.workspaceId,
    draftId: input.draftId,
    mayCommit: false,
  };
}

export function buildPrepareToCommitInterface(input: {
  readonly prepareId: string;
}): PrepareToCommitInterface {
  return {
    from: "prepare",
    to: "commit",
    prepareId: input.prepareId,
    status: "ready_for_commit",
    requiresUserApproval: true,
  };
}

export function buildCommitToRealityInterface(input: {
  readonly transactionId: string;
}): CommitToRealityInterface {
  return {
    from: "commit",
    to: "reality_graph",
    transactionId: input.transactionId,
    actor: "user",
    ledgerRequired: true,
  };
}

export function buildRealityToGlobeInterface(): RealityToGlobeInterface {
  return {
    from: "reality_graph",
    to: "globe",
    viewOnly: true,
    editor: false,
  };
}

/**
 * Kernel gate used by hosts before dangerous ops.
 * Wraps constitution asserts; does not delete existing commit gates.
 */
export function gateRealityOsOperation(input: {
  readonly op:
    | "draft"
    | "simulate"
    | "prepare"
    | "commit"
    | "mutate_reality_direct";
  readonly source: string;
  readonly userApproved?: boolean;
}):
  | { readonly ok: true }
  | { readonly ok: false; readonly reasonKo: string } {
  try {
    if (input.op === "mutate_reality_direct") {
      assertNoDirectRealityMutation("mutate_reality");
    }
    if (input.op === "commit") {
      assertAiCannotCommit(input.source);
      assertCommitRequiresUserApproval(input.userApproved === true);
    }
    return { ok: true };
  } catch (e) {
    const detail = e instanceof Error ? e.message : "constitution";
    emitRealityOsEvent({
      ...makeRealityOsEventBase({
        name: "rimvio:reality-os:constitution-violation",
        layer: "commit",
      }),
      name: "rimvio:reality-os:constitution-violation",
      principle: "gateRealityOsOperation",
      detailKo: detail,
    });
    return { ok: false, reasonKo: detail };
  }
}

export function listRealityOsLayerInterfaces(): readonly RealityOsLayerInterface[] {
  return [
    buildContextToWorkspaceInterface({ contextId: "_" }),
    buildWorkspaceToGraphInterface({ entityRefs: [] }),
    buildAgentToDraftInterface({ workspaceId: "_", draftId: "_" }),
    {
      from: "draft",
      to: "simulation",
      status: "SIMULATION_ONLY",
      mutateReality: false,
    },
    buildPrepareToCommitInterface({ prepareId: "_" }),
    buildCommitToRealityInterface({ transactionId: "_" }),
    buildRealityToGlobeInterface(),
  ];
}
