/**
 * Target Resolver — determines WHERE a command should apply (ADR-035).
 *
 * Same utterance → different target depending on current state.
 * "호텔 찾아줘" → new_context (Globe) / current_context (Context open) / current_workspace (Workspace active).
 */

import type { ActionVerb } from "@/lib/rimvio-command/action-verb";
import {
  isExplicitContextContinue,
  shouldSpawnNewContext,
} from "@/lib/context-run/should-spawn-new-context";
import { classifyExperienceRunIntent } from "@/lib/experience-run/classify-experience-run-intent";
import { isGlobeIngressEligible } from "@/lib/globe-ingress/compile-globe-ingress";
import { activeContextAllowsDomainScout } from "@/lib/workspace-kind/resolve-active-workspace-kind";
import type { WorkspaceKind } from "@/lib/workspace-kind/types";

export const COMMAND_TARGETS = [
  "new_context",
  "current_context",
  "current_workspace",
  "selected_artifact",
  "external_reality",
] as const;

export type CommandTarget = (typeof COMMAND_TARGETS)[number];

export type CommandTargetInput = {
  readonly verb: ActionVerb | null;
  readonly utterance: string;
  readonly activeContextId?: string | null;
  readonly activeWorkspaceId?: string | null;
  readonly selectedArtifactId?: string | null;
  readonly activeWorkspaceKind?: WorkspaceKind | null;
};

export type CommandTargetResult = {
  readonly target: CommandTarget;
  readonly reason: string;
};

/**
 * Verbs that always target external reality regardless of state.
 * These bypass context/workspace scoping.
 */
const REALITY_VERBS: ReadonlySet<ActionVerb> = new Set(["book", "action"]);

/**
 * Verbs that only make sense as "resume existing work".
 */
const RESUME_VERBS: ReadonlySet<ActionVerb> = new Set(["resume"]);

/**
 * Verbs that typically operate on what the user is currently looking at.
 */
const ARTIFACT_VERBS: ReadonlySet<ActionVerb> = new Set(["edit", "cancel"]);

/**
 * Domain scout (lodging/eatery) continues only on travel-compatible Context.
 */
function isDomainScoutInContext(
  utterance: string,
  activeWorkspaceKind?: WorkspaceKind | null,
): boolean {
  if (!activeContextAllowsDomainScout(activeWorkspaceKind)) return false;
  if (isGlobeIngressEligible(utterance)) return false;
  const exp = classifyExperienceRunIntent(utterance);
  return !!(
    exp &&
    (exp.profile === "lodging_search" || exp.profile === "eatery_search")
  );
}

function isTopicMismatch(
  utterance: string,
  activeContextId: string,
  activeWorkspaceKind?: WorkspaceKind | null,
): boolean {
  if (isDomainScoutInContext(utterance, activeWorkspaceKind)) return false;
  return shouldSpawnNewContext({
    utterance,
    activeContextEventId: activeContextId,
  });
}

export function resolveCommandTarget(
  input: CommandTargetInput,
): CommandTargetResult {
  const {
    verb,
    utterance,
    activeContextId,
    activeWorkspaceId,
    selectedArtifactId,
    activeWorkspaceKind,
  } = input;
  const text = utterance.trim();
  const active = activeContextId?.trim() || null;
  const workspace = activeWorkspaceId?.trim() || null;
  const artifact = selectedArtifactId?.trim() || null;

  if (!text) {
    if (active) return { target: "current_context", reason: "empty_active" };
    return { target: "new_context", reason: "empty_globe" };
  }

  if (verb && RESUME_VERBS.has(verb)) {
    if (active) return { target: "current_context", reason: "resume_active" };
    return { target: "new_context", reason: "resume_no_context" };
  }

  if (verb && REALITY_VERBS.has(verb) && active) {
    return { target: "external_reality", reason: "reality_verb" };
  }

  if (verb && ARTIFACT_VERBS.has(verb) && artifact) {
    return { target: "selected_artifact", reason: "artifact_verb" };
  }

  if (verb === "create" && !active) {
    return { target: "new_context", reason: "create_globe" };
  }

  if (active && isTopicMismatch(text, active, activeWorkspaceKind)) {
    return { target: "new_context", reason: "topic_mismatch" };
  }

  if (isExplicitContextContinue(text)) {
    if (active) return { target: "current_context", reason: "explicit_continue" };
    return { target: "new_context", reason: "continue_no_context" };
  }

  if (workspace) {
    return { target: "current_workspace", reason: "workspace_active" };
  }

  if (active) {
    return { target: "current_context", reason: "context_active" };
  }

  return { target: "new_context", reason: "no_state" };
}
