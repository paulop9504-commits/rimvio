/**
 * CommandIr assembler — ADR-035 pipe + ADR-053 leafHint (Phase 2).
 * Does not invent a parallel Intent system.
 */

import type { IntentFamily } from "@/lib/rule-engine/constitution";
import { COMMIT_REQUIRED_INTENTS } from "@/lib/rule-engine/constitution";
import { classifyActionVerb } from "@/lib/rimvio-command/action-verb";
import type { ActionVerb } from "@/lib/rimvio-command/action-verb";
import { resolveIntentFromActionVerb } from "@/lib/rimvio-command/action-verb-to-intent";
import {
  resolveProductVerbFamily,
  type ProductVerbFamily,
} from "@/lib/rimvio-command/product-verb-family";
import {
  resolveCommandObjectHints,
  resolveCommitPolicy,
  resolveLeafHint,
  type CommandCommitPolicy,
  type CommandLeafHint,
} from "@/lib/rimvio-command/resolve-leaf-hint";
import {
  resolveCommandTarget,
  type CommandTarget,
} from "@/lib/rimvio-command/resolve-command-target";
import type { RimvioCommandMode } from "@/lib/rimvio-command/types";
import type { WorkspaceKind } from "@/lib/workspace-kind/types";

function modeFromTarget(target: CommandTarget): RimvioCommandMode {
  switch (target) {
    case "new_context":
      return "create";
    case "external_reality":
      return "execute";
    default:
      return "continue";
  }
}

export type CommandIrObjects = {
  readonly locationHint: string | null;
  readonly entityTypeHint: string | null;
  readonly eventRefHint: string | null;
  readonly dayHint: number | null;
};

export type CommandIr = {
  readonly verb: ActionVerb | null;
  readonly productFamily: ProductVerbFamily | null;
  readonly target: CommandTarget;
  readonly intentFamily: IntentFamily;
  readonly mode: RimvioCommandMode;
  readonly leafHint: CommandLeafHint | null;
  readonly commitPolicy: CommandCommitPolicy;
  readonly objects: CommandIrObjects;
  readonly reason: string;
};

export type ResolveCommandIrInput = {
  readonly utterance: string;
  readonly activeContextId?: string | null;
  readonly activeWorkspaceId?: string | null;
  readonly selectedArtifactId?: string | null;
  readonly activeWorkspaceKind?: WorkspaceKind | null;
};

/**
 * Full CommandIr: Verb → Target → IntentFamily → leafHint → commitPolicy.
 * When verb is set and leafHint would be missing, deterministic fallback applies.
 */
export function resolveCommandIr(input: ResolveCommandIrInput): CommandIr {
  const text = input.utterance.trim();
  const verb = classifyActionVerb(text);
  const { target, reason: targetReason } = resolveCommandTarget({
    verb,
    utterance: text,
    activeContextId: input.activeContextId,
    activeWorkspaceId: input.activeWorkspaceId,
    selectedArtifactId: input.selectedArtifactId,
    activeWorkspaceKind: input.activeWorkspaceKind,
  });
  const intentFamily = resolveIntentFromActionVerb(verb, target, text);
  const leafHint = resolveLeafHint({ verb, utterance: text, target });
  // leafHint required whenever verb resolves (FALLBACK_BY_VERB inside resolver).
  const productFamily = resolveProductVerbFamily({
    verb,
    utterance: text,
    leafHint,
  });
  let commitPolicy = resolveCommitPolicy({ verb, leafHint });
  if (COMMIT_REQUIRED_INTENTS.has(intentFamily)) {
    commitPolicy = "field_commit";
  }
  // book / auto with active context: mode aligns with ADR-035 Execute / Continue.
  let mode = modeFromTarget(target);
  if (verb === "auto" && input.activeContextId?.trim()) {
    mode = "continue";
  }
  if (verb === "book" && input.activeContextId?.trim()) {
    mode = "execute";
  }
  const objects = resolveCommandObjectHints(text);

  return {
    verb,
    productFamily,
    target,
    intentFamily,
    mode,
    leafHint,
    commitPolicy,
    objects,
    reason: targetReason,
  };
}

/** True when leaf requires Agent Task Graph / execute loop (not chat essay). */
export function commandIrRequestsTaskGraph(ir: CommandIr): boolean {
  if (!ir.leafHint) return false;
  return (
    ir.leafHint === "agent_execute_loop" ||
    ir.leafHint === "autonomous_execution" ||
    ir.leafHint === "task_graph_resume" ||
    ir.leafHint === "task_graph" ||
    ir.leafHint === "plan_generation" ||
    ir.leafHint === "context_blueprint_create" ||
    ir.leafHint === "schedule_optimizer" ||
    ir.leafHint === "constraint_solver" ||
    ir.leafHint === "route_optimizer"
  );
}
