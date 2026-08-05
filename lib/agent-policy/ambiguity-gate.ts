/**
 * P1 · Ambiguity Gate — do not guess when multiple interpretations are open.
 */

import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import { extractNearPlaceLabelFromUtterance } from "@/lib/context-workspace/reality-anchor/resolve-anchor-from-utterance";

export type AmbiguityGateResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly statusKo: string;
      readonly reason: "here_without_anchor" | "near_without_place" | "multi_read";
    };

const HERE_NEAR_RE =
  /여기\s*근처|이쪽(?:으로)?|이\s*주변|around\s*here|near\s*me|내\s*위치\s*근처/iu;

const BARE_NEAR_RE =
  /^(?:근처|주변)\s*(?:호텔|숙소|맛집|카페)?|(?:호텔|숙소|맛집)\s*(?:근처|주변)(?:에|로)?\s*(?:찾아|보여|검색)?/iu;

function hasWorkspaceAnchor(contextEventId: string): boolean {
  const state = readContextWorkspace(contextEventId);
  if (!state) return false;
  return state.nodes.some(
    (n) =>
      n.source === "reality_anchor" ||
      n.tags.includes("place_locate") ||
      n.tags.includes("reality_anchor") ||
      (typeof n.placeId === "string" && n.placeId.startsWith("geo:")),
  );
}

/**
 * Block scouts that would invent a place when the user was vague.
 */
export function resolveAmbiguityGate(input: {
  readonly utterance: string;
  readonly contextEventId: string;
}): AmbiguityGateResult {
  const text = input.utterance.trim();
  if (!text) return { ok: true };

  if (HERE_NEAR_RE.test(text) && !hasWorkspaceAnchor(input.contextEventId)) {
    return {
      ok: false,
      reason: "here_without_anchor",
      statusKo: "「여기」기준점이 없어요 · 역·장소 이름을 먼저 말해 주세요",
    };
  }

  const nearLabel = extractNearPlaceLabelFromUtterance(text);
  const wantsNear = /근처|주변|near|around/iu.test(text);
  if (
    wantsNear &&
    BARE_NEAR_RE.test(text) &&
    (!nearLabel || nearLabel === text) &&
    !hasWorkspaceAnchor(input.contextEventId)
  ) {
    return {
      ok: false,
      reason: "near_without_place",
      statusKo: "어디 근처인지 모호해요 · 「○○역 근처」처럼 말해 주세요",
    };
  }

  // Compound multi-read: day rebuild + hotel find in one breath — ask to split.
  if (
    /(?:일정|데이|day)\s*(?:전체|다시|재구성|리빌드)/iu.test(text) &&
    /호텔|숙소|맛집/iu.test(text)
  ) {
    return {
      ok: false,
      reason: "multi_read",
      statusKo: "요청이 두 가지예요 · 일정 수정과 검색을 나눠서 말해 주세요",
    };
  }

  return { ok: true };
}
