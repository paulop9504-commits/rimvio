/**
 * P1 · Mutation Scope Guard — small ask must not rebuild the whole trip.
 */

import type { WorkspacePatchKind } from "@/lib/context-workspace/workspace-patch/types";

export type MutationScopeGateResult =
  | {
      readonly ok: true;
      readonly allowedPatchKinds: readonly WorkspacePatchKind[] | null;
    }
  | {
      readonly ok: false;
      readonly statusKo: string;
      readonly reason: "rebuild_trip" | "scope_overflow";
    };

const DELETE_ONLY_RE =
  /(?:이|그)\s*(?:호텔|숙소|곳|후보).{0,8}(?:빼|삭제|제거|빼\s*줘)|(?:빼|삭제|제거)\s*줘/iu;

const DAY_ADD_RE =
  /(?:day\s*|데이\s*|Day\s*)(\d+)|(\d+)\s*일차?.{0,12}(?:넣|추가|옮겨)/iu;

const REBUILD_RE =
  /일정\s*(?:전체|다)\s*(?:다시|재|바꿔)|트립\s*전체\s*재|rebuild\s*trip|여행\s*다시\s*짜/iu;

/**
 * Limit which Patch kinds may fire for this utterance.
 */
export function resolveMutationScopeGuard(input: {
  readonly utterance: string;
  readonly patchKind?: string | null;
}): MutationScopeGateResult {
  const text = input.utterance.trim();
  if (!text) {
    return { ok: true, allowedPatchKinds: null };
  }

  if (REBUILD_RE.test(text)) {
    return {
      ok: false,
      reason: "rebuild_trip",
      statusKo:
        "일정 전체 재구성은 한 번에 안 해요 · Day에 넣을 장소만 말해 주세요",
    };
  }

  if (DELETE_ONLY_RE.test(text)) {
    if (
      input.patchKind &&
      input.patchKind !== "delete_entity" &&
      input.patchKind !== "filter_entity"
    ) {
      return {
        ok: false,
        reason: "scope_overflow",
        statusKo: "빼달라는 요청이라 검색·일정 전체는 건드리지 않아요",
      };
    }
    return {
      ok: true,
      allowedPatchKinds: ["delete_entity", "filter_entity", "update_entity"],
    };
  }

  if (DAY_ADD_RE.test(text) && !/호텔|숙소|맛집\s*찾아/iu.test(text)) {
    return {
      ok: true,
      allowedPatchKinds: ["move_schedule", "create_entity", "update_entity"],
    };
  }

  return { ok: true, allowedPatchKinds: null };
}

export function isPatchKindAllowed(
  kind: string,
  allowed: readonly string[] | null,
): boolean {
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(kind);
}
