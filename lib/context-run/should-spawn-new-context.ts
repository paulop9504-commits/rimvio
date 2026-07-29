/**
 * New Intent → New Context (ADR-029).
 * Attach to the open hub Context only when the user asks to continue.
 */

import { classifyContextCommand } from "@/lib/context-command/classify-context-command";
import { isGlobeIngressEligible } from "@/lib/globe-ingress/compile-globe-ingress";
import { classifyExperienceRunIntent } from "@/lib/experience-run/classify-experience-run-intent";
import { classifyWorkspaceKind } from "@/lib/workspace-kind/classify-workspace-kind";

/** User explicitly wants to keep working on the active Context. */
export function isExplicitContextContinue(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) {
    return false;
  }
  return /(?:이\s*)?(?:맥락|작업장|컨텍스트)(?:에|에서|으로)|이어서\s*(?:해|하|짜|작업|열어|진행|만들)|여기서\s*(?:이어서|계속|작업)|지금\s*(?:이\s*)?맥락|기존\s*맥락|연결해서|이어서\s*해\s*줘/iu.test(
    text,
  );
}

/**
 * True → mint a new Context (ignore active hub id).
 * False → may attach / refine on active Context.
 */
export function shouldSpawnNewContext(input: {
  readonly utterance: string;
  readonly activeContextEventId?: string | null;
}): boolean {
  const text = input.utterance.trim();
  if (!text) {
    return false;
  }

  // Command Bar ops act on the current Context.
  if (classifyContextCommand(text)) {
    return false;
  }

  if (isExplicitContextContinue(text)) {
    return false;
  }

  // Fresh trip / experience / workspace-kind Intent → always new when asked.
  if (isGlobeIngressEligible(text)) {
    return true;
  }
  if (classifyExperienceRunIntent(text)) {
    return true;
  }
  if (classifyWorkspaceKind(text)) {
    return true;
  }

  // No active Context → callers still mint when eligible; refine alone does not spawn.
  return false;
}

/** Resolve which Context id to pass into Continuum / Ingress compile. */
export function resolveIngressContextEventId(input: {
  readonly utterance: string;
  readonly activeContextEventId?: string | null;
  readonly forceNewContext?: boolean;
}): string | null {
  if (input.forceNewContext) {
    return null;
  }
  const active = input.activeContextEventId?.trim() || null;
  if (!active) {
    return null;
  }
  if (shouldSpawnNewContext({ utterance: input.utterance, activeContextEventId: active })) {
    return null;
  }
  return active;
}
