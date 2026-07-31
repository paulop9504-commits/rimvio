/**
 * Command-first orchestration law (Workspace UX).
 *
 * Interpret utterance as Command first → execute.
 * Only Ask when confidence is low / meaning is ambiguous.
 *
 * Confidence:
 * - ≥ 0.9 → execute (no question)
 * - < 0.6 → ask
 * - between → patch / soft continue when possible, else ask
 */

import { isCompoundActionUtterance } from "@/lib/action-planner/build-compare-reserve-plan";
import { hasConcurrentMultiDomainSearchCues } from "@/lib/globe/context-condition-ai/concurrent-lodging-eatery-cues";
import { isInstantEaterySearch } from "@/lib/globe/context-condition-ai/instant-eatery-search";
import {
  isInstantLodgingSearch,
  requiresLodgingBookingSlots,
} from "@/lib/globe/context-condition-ai/instant-lodging-search";
import { detectLodgingSearchIntent } from "@/lib/globe/lodging/detect-lodging-search-intent";
import { classifyActionVerb } from "@/lib/rimvio-command/action-verb";
import { isOpenWorkspaceUtterance } from "@/lib/context-workspace/is-open-workspace-utterance";
import {
  activeContextAllowsDomainScout,
  resolveActiveWorkspaceKind,
} from "@/lib/workspace-kind/resolve-active-workspace-kind";
import type { WorkspaceKind } from "@/lib/workspace-kind/types";

export const COMMAND_EXECUTE_CONFIDENCE = 0.9;
export const COMMAND_ASK_CONFIDENCE = 0.6;

export type CommandFirstAction = "execute" | "patch" | "ask";

export type CommandFirstDecision = {
  readonly action: CommandFirstAction;
  readonly confidence: number;
  readonly commandId:
    | "search_hotel"
    | "search_eatery"
    | "booking_prepare"
    | "resume"
    | "open_workspace"
    | "compound_plan"
    | null;
  readonly reason: string;
};

function detectKeepReplaceDomain(
  text: string,
): "search_eatery" | "search_hotel" | null {
  const keepLodging =
    /숙소.*(그대로|유지|안\s*바꿔|그냥|빼고)|숙소는.*두/u.test(text);
  const keepEatery =
    /맛집.*(그대로|유지|안\s*바꿔)|식당.*(그대로|유지)/u.test(text);
  const replaceEatery =
    /맛집.*(바꿔|교체|다시)|식당.*(바꿔|교체|다시)|저녁.*(바꿔|다시)|맛집만|식당만/u.test(
      text,
    );
  const replaceLodging =
    /숙소.*(바꿔|교체|다시)|숙소만|호텔만/u.test(text);
  if (keepLodging && replaceEatery) {
    return "search_eatery";
  }
  if (keepEatery && replaceLodging) {
    return "search_hotel";
  }
  return null;
}

/**
 * High-confidence domain commands on an open travel-compatible Context.
 * Default = execute, never “이어서 할까요?”.
 */
export function resolveCommandFirstDecision(input: {
  readonly utterance: string;
  readonly activeContextId?: string | null;
  readonly activeWorkspaceKind?: WorkspaceKind | null;
}): CommandFirstDecision {
  const text = input.utterance.trim();
  if (!text) {
    return {
      action: "ask",
      confidence: 0,
      commandId: null,
      reason: "empty",
    };
  }

  const active = input.activeContextId?.trim() || null;
  const kind =
    input.activeWorkspaceKind !== undefined
      ? input.activeWorkspaceKind
      : resolveActiveWorkspaceKind(active);
  const scoutOk = Boolean(active) && activeContextAllowsDomainScout(kind);
  const verb = classifyActionVerb(text);

  if (isOpenWorkspaceUtterance(text)) {
    return {
      action: active ? "execute" : "ask",
      confidence: active ? 0.99 : 0.45,
      commandId: "open_workspace",
      reason: active ? "explicit_open_workspace" : "open_needs_context",
    };
  }

  // Keep/replace patch before single-domain collapse.
  const keepReplace = detectKeepReplaceDomain(text);
  if (keepReplace && scoutOk) {
    return {
      action: "execute",
      confidence: 0.96,
      commandId: keepReplace,
      reason: "spatial_keep_replace_patch",
    };
  }

  // Complex multi-intent → Action Planner (never collapse to one domain scout).
  if (
    isCompoundActionUtterance(text) ||
    hasConcurrentMultiDomainSearchCues(text)
  ) {
    return {
      action: scoutOk || active ? "execute" : "ask",
      confidence: scoutOk || active ? 0.97 : 0.55,
      commandId: "compound_plan",
      reason: "compound_multi_intent",
    };
  }

  // Explicit booking/checkout → still execute path, but slots may gate downstream.
  if (requiresLodgingBookingSlots(text) && detectLodgingSearchIntent(text)) {
    return {
      action: scoutOk ? "execute" : "ask",
      confidence: scoutOk ? 0.92 : 0.55,
      commandId: "search_hotel",
      reason: scoutOk ? "booking_slots_search" : "booking_needs_context",
    };
  }

  if (
    scoutOk &&
    (isInstantLodgingSearch(text) || detectLodgingSearchIntent(text))
  ) {
    return {
      action: "execute",
      confidence: 0.98,
      commandId: "search_hotel",
      reason: "active_domain_scout_lodging",
    };
  }

  if (scoutOk && isInstantEaterySearch(text)) {
    return {
      action: "execute",
      confidence: 0.98,
      commandId: "search_eatery",
      reason: "active_domain_scout_eatery",
    };
  }

  if (verb === "book" || verb === "action") {
    return {
      action: active ? "execute" : "ask",
      confidence: active ? 0.94 : 0.5,
      commandId: "booking_prepare",
      reason: active ? "action_first" : "action_no_context",
    };
  }

  if (verb === "resume") {
    return {
      action: active ? "execute" : "ask",
      confidence: active ? 0.9 : 0.4,
      commandId: "resume",
      reason: active ? "explicit_continue" : "continue_no_context",
    };
  }

  // Ambiguous short asks — only then question.
  if (/^(?:좋은\s*곳|추천|뭐\s*하|어디|어쩌|어떻게)/iu.test(text)) {
    return {
      action: "ask",
      confidence: 0.41,
      commandId: null,
      reason: "ambiguous_utterance",
    };
  }

  if (active) {
    return {
      action: "patch",
      confidence: 0.72,
      commandId: null,
      reason: "active_context_soft_patch",
    };
  }

  return {
    action: "ask",
    confidence: 0.35,
    commandId: null,
    reason: "no_active_context",
  };
}

export function shouldExecuteWithoutAsk(
  decision: CommandFirstDecision,
): boolean {
  return (
    decision.action === "execute" &&
    decision.confidence >= COMMAND_EXECUTE_CONFIDENCE
  );
}
