/**
 * Deterministic NL → Capability Intent (open which Objects).
 * Orchestrator gate — not LLM first.
 */

import type { WorkspaceCapabilityIntentId } from "@/lib/workspace-capability/types";
import type { ContextWorkspaceDomain } from "@/lib/context-workspace/types";

function normalize(text: string): string {
  return text.trim().replace(/\s+/gu, " ");
}

export function resolveWorkspaceCapabilityIntent(
  utterance: string | null | undefined,
): WorkspaceCapabilityIntentId | null {
  const t = normalize(utterance ?? "");
  if (!t) return null;

  if (
    /공유|초대|같이\s*(?:짜|가|보)|멤버|친구랑|permission|share/iu.test(t)
  ) {
    return "share_collab";
  }

  if (
    /\d{1,2}\s*박\s*\d{1,2}\s*일|\d{1,2}\s*박|\d{1,2}\s*일\s*(?:여행|일정)|여행\s*일정|일정\s*(?:만들|짜|계획)/iu.test(
      t,
    )
  ) {
    return "trip_plan";
  }

  if (
    /(?:호텔|숙소|lodging).*(?:예약|예약해|잡아)|(?:예약|예약해).*(?:호텔|숙소)|호텔\s*비교|숙소\s*비교/iu.test(
      t,
    )
  ) {
    return "lodging_book";
  }

  if (
    /맛집|식당|라멘|스시|이자카야|먹을|밥\s*집|eatery|restaurant/iu.test(t)
  ) {
    return "eatery_search";
  }

  if (/호텔|숙소|리조트|hotel|lodging/iu.test(t) && !/맛집|식당/iu.test(t)) {
    return "lodging_book";
  }

  if (
    /(?:오사카|도쿄|제주|부산|교토).{0,16}(?:여행|트립|갈|가)/iu.test(t)
  ) {
    return "trip_plan";
  }

  return null;
}

/** Prefer utterance; else infer from Workspace domain + draft shape. */
export function resolveWorkspaceCapabilityIntentForState(input: {
  readonly utterance?: string | null;
  readonly query?: string | null;
  readonly domain?: ContextWorkspaceDomain | null;
  readonly hasRealityDraftDays?: boolean;
}): WorkspaceCapabilityIntentId {
  const fromUtterance =
    resolveWorkspaceCapabilityIntent(input.utterance) ??
    resolveWorkspaceCapabilityIntent(input.query);
  if (fromUtterance) return fromUtterance;

  if (input.hasRealityDraftDays) return "trip_plan";
  if (input.domain === "eatery") return "eatery_search";
  if (input.domain === "lodging") return "lodging_book";
  return "generic_map";
}
