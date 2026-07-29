/**
 * RIMVIO Command Router — 4-step pipe (ADR-035).
 *
 * 1. classifyActionVerb   → what verb?
 * 2. resolveCommandTarget → where does it apply?
 * 3. resolveIntentFromActionVerb → IntentFamily (used downstream)
 * 4. mode: Create | Continue | Execute
 */

import { classifyContextCommand } from "@/lib/context-command/classify-context-command";
import {
  isExplicitContextContinue,
  shouldSpawnNewContext,
} from "@/lib/context-run/should-spawn-new-context";
import { classifyExperienceRunIntent } from "@/lib/experience-run/classify-experience-run-intent";
import { isGlobeIngressEligible } from "@/lib/globe-ingress/compile-globe-ingress";
import { isActionFirstUtterance } from "@/lib/rule-engine/is-action-first-utterance";
import { classifyActionVerb } from "@/lib/rimvio-command/action-verb";
import {
  resolveCommandTarget,
  type CommandTarget,
} from "@/lib/rimvio-command/resolve-command-target";
import type { RimvioCommandRoute } from "@/lib/rimvio-command/types";
import {
  activeContextAllowsDomainScout,
  resolveActiveWorkspaceKind,
} from "@/lib/workspace-kind/resolve-active-workspace-kind";
import type { WorkspaceKind } from "@/lib/workspace-kind/types";

const RESUME_CUE =
  /^(?:이어(?:줘|서|가|주세요)|계속(?:해|해\s*줘|진행)|다시\s*(?:열어|시작)|resume)$/iu;

function modeFromTarget(target: CommandTarget): RimvioCommandRoute["mode"] {
  switch (target) {
    case "new_context":
      return "create";
    case "external_reality":
      return "execute";
    default:
      return "continue";
  }
}

/**
 * Route a user command into Create / Continue / Execute.
 * Enriched with ActionVerb + CommandTarget when available.
 */
export function routeRimvioCommandMode(input: {
  readonly utterance: string;
  readonly activeContextId?: string | null;
  readonly activeWorkspaceId?: string | null;
  readonly selectedArtifactId?: string | null;
  /** When set, skips event-store lookup (tests / callers with known kind). */
  readonly activeWorkspaceKind?: WorkspaceKind | null;
}): RimvioCommandRoute {
  const text = input.utterance.trim();
  const active = input.activeContextId?.trim() || null;
  const activeKind =
    input.activeWorkspaceKind !== undefined
      ? input.activeWorkspaceKind
      : resolveActiveWorkspaceKind(active);

  // Step 1: classify verb
  const verb = classifyActionVerb(text);

  if (!text) {
    return {
      mode: active ? "continue" : "create",
      reason: "empty",
      verb,
    };
  }

  // ADR-028 — migrate / clone / save stay on the open Context.
  if (classifyContextCommand(text)) {
    return { mode: "continue", reason: "context_command", verb };
  }

  if (isExplicitContextContinue(text) || RESUME_CUE.test(text)) {
    return { mode: "continue", reason: "explicit_continue", verb };
  }

  // Open Context: Execute (Reserve / Pin / …) before mistaking for new Intent spawn.
  if (active && isActionFirstUtterance(text)) {
    return { mode: "execute", reason: "action_first", verb, target: "external_reality" };
  }

  // Open travel hub: domain scout (숙소·맛집) continues here — not a new Context.
  // Market / driver hub + hotel search → create (intent switch).
  if (
    active &&
    !isGlobeIngressEligible(text) &&
    activeContextAllowsDomainScout(activeKind)
  ) {
    const experience = classifyExperienceRunIntent(text);
    if (
      experience &&
      (experience.profile === "lodging_search" ||
        experience.profile === "eatery_search")
    ) {
      return { mode: "continue", reason: "active_domain_scout", verb, target: "current_context" };
    }
  }

  // Step 2: resolve target (uses verb + state)
  const { target, reason: targetReason } = resolveCommandTarget({
    verb,
    utterance: text,
    activeContextId: active,
    activeWorkspaceId: input.activeWorkspaceId,
    selectedArtifactId: input.selectedArtifactId,
    activeWorkspaceKind: activeKind,
  });

  // Auto verb → delegation mode (always continue)
  if (verb === "auto" && active) {
    return { mode: "continue", reason: "delegation", verb, target };
  }

  // Topic mismatch inside a context → suggest new context
  if (target === "new_context" && active && targetReason === "topic_mismatch") {
    return { mode: "create", reason: "topic_mismatch", verb, target };
  }

  if (
    shouldSpawnNewContext({
      utterance: text,
      activeContextEventId: active,
      activeWorkspaceKind: activeKind,
    })
  ) {
    return { mode: "create", reason: "new_intent", verb, target: "new_context" };
  }

  if (!active) {
    return { mode: "create", reason: "globe_home", verb, target: "new_context" };
  }

  // Step 4: derive mode from target
  const mode = modeFromTarget(target);
  return { mode, reason: targetReason, verb, target };
}
