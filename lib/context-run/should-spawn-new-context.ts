/**
 * New Intent → New Context (ADR-029).
 * Attach to the open hub Context only when the user asks to continue,
 * or when domain scout (숙소·맛집) continues on a travel-compatible hub.
 */

import { classifyContextCommand } from "@/lib/context-command/classify-context-command";
import { isGlobeIngressEligible } from "@/lib/globe-ingress/compile-globe-ingress";
import { classifyExperienceRunIntent } from "@/lib/experience-run/classify-experience-run-intent";
import { classifyWorkspaceKind } from "@/lib/workspace-kind/classify-workspace-kind";
import {
  activeContextAllowsDomainScout,
  resolveActiveWorkspaceKind,
} from "@/lib/workspace-kind/resolve-active-workspace-kind";
import type { WorkspaceKind } from "@/lib/workspace-kind/types";
import { utteranceConflictsActiveDestination } from "@/lib/context-run/destination-context-conflict";

/** User explicitly wants to keep working on the active Context. */
export function isExplicitContextContinue(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) {
    return false;
  }
  return /(?:이\s*)?(?:맥락|작업장|컨텍스트)(?:에|에서|으로)|이어서\s*(?:해|하|짜|작업|열어|진행|만들)|여기서\s*(?:이어서|계속|작업)|지금\s*(?:이\s*)?맥락|기존\s*맥락|연결해서|이어서\s*해\s*줘|^(?:이어(?:줘|서|가|주세요)|계속(?:해|해\s*줘|진행)|다시\s*(?:열어|시작))$|(?:작업장|워크스페이스)\s*(?:띄워|열어|펼쳐)/iu.test(
    text,
  );
}

function isDomainScoutUtterance(utterance: string): boolean {
  const exp = classifyExperienceRunIntent(utterance);
  return (
    exp?.profile === "lodging_search" || exp?.profile === "eatery_search"
  );
}

/**
 * True → mint a new Context (ignore active hub id).
 * False → may attach / refine on active Context.
 */
export function shouldSpawnNewContext(input: {
  readonly utterance: string;
  readonly activeContextEventId?: string | null;
  /** When set, skips event-store lookup. */
  readonly activeWorkspaceKind?: WorkspaceKind | null;
  /** Optional dest override when Workspace memory is missing (tests / projection). */
  readonly activeDestinationKo?: string | null;
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

  const active = input.activeContextEventId?.trim() || null;
  const kind =
    input.activeWorkspaceKind !== undefined
      ? input.activeWorkspaceKind
      : resolveActiveWorkspaceKind(active);

  // Different destination on an open hub → new Context (ADR-029).
  // Never refine Osaka Workspace when the user said 오키나와.
  if (
    active &&
    utteranceConflictsActiveDestination({
      utterance: text,
      activeContextEventId: active,
      activeDestinationKo: input.activeDestinationKo,
    })
  ) {
    return true;
  }

  // Open travel (or unknown hub): 숙소·맛집 scout stays — not a new Intent.
  if (active && activeContextAllowsDomainScout(kind) && isDomainScoutUtterance(text)) {
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
  readonly activeWorkspaceKind?: WorkspaceKind | null;
}): string | null {
  if (input.forceNewContext) {
    return null;
  }
  const active = input.activeContextEventId?.trim() || null;
  if (!active) {
    return null;
  }
  if (
    shouldSpawnNewContext({
      utterance: input.utterance,
      activeContextEventId: active,
      activeWorkspaceKind: input.activeWorkspaceKind,
    })
  ) {
    return null;
  }
  return active;
}
