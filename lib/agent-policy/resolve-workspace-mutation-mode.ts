/**
 * Clear intent → replace candidates; soft intent → refine in-set.
 * ADR-048 · Cursor Agent Policy.
 */

import { isSameProjectReSearchUtterance } from "@/lib/graph-command/is-same-project-re-search";
import { parseMaxNightlyPriceKrw } from "@/lib/globe/context-condition-ai/filter-lodging-for-intent";
import type { WorkspaceMutationMode } from "@/lib/agent-policy/cursor-agent-policy";

export type WorkspaceMutationDecision = {
  readonly mode: WorkspaceMutationMode;
  readonly reason:
    | "clear_location"
    | "clear_stay_type"
    | "clear_hard_price"
    | "clear_research"
    | "soft_rank"
    | "soft_filter"
    | "none";
  readonly replyHintKo: string | null;
};

/** Soft in-set refine — do not wipe inventory. */
const SOFT_REFINE_RE =
  /더\s*싸|저렴한\s*순|가성비|싼\s*순|평점\s*높|별점\s*높|상위\s*\d|이\s*중|그중|그\s*중|필터|정렬|가까운\s*순/iu;

/** Clear location / area pivot — re-scout even if pins already exist. */
const CLEAR_LOCATION_RE =
  /(?:쪽으로|중심으로|근처로|주변으로|역\s*앞|동네로)|(?:[가-힣A-Za-z0-9·]+역)\s*(?:근처|주변|앞)|(?:난바|우메다|신사이바시|도톤보리|모리노미야|모리노미아|신주쿠|시부야|긴자|명동|홍대|강남|해운대|서면)\s*(?:쪽|근처|중심|로|으로)?/iu;


const CLEAR_STAY_TYPE_RE =
  /(?:캡슐|호스텔|게스트\s*하우스|료칸|리조트|비즈니스\s*호텔|도미토리).{0,12}(?:찾|보여|바꿔|해\s*줘|해줘|로\s*해)|(?:찾|보여|바꿔).{0,12}(?:캡슐|호스텔|게스트\s*하우스|료칸)/iu;

const CLEAR_RESEARCH_RE =
  /다시\s*(?:찾|보여|검색|골라)|다른\s*(?:거|곳|호텔|숙소)|바꿔\s*(?:줘|봐|달)|교체|re-?\s*search|refresh/iu;

/** Named landmark / attraction find — replace lodging inventory with POI. */
const CLEAR_LANDMARK_FIND_RE =
  /(?:유니버설|유니버셜|usj|universal|디즈니|disney).{0,24}(?:찾|보여|검색)|(?:찾|보여|검색).{0,24}(?:유니버설|유니버셜|usj|universal|디즈니)|유니버설\s*스튜디오|유니버셜\s*스튜디오/iu;

export function resolveWorkspaceMutationMode(input: {
  readonly utterance: string;
  readonly hasVisibleCandidates: boolean;
}): WorkspaceMutationDecision {
  const text = input.utterance.trim();
  if (!text) {
    return { mode: "none", reason: "none", replyHintKo: null };
  }

  if (CLEAR_STAY_TYPE_RE.test(text)) {
    return {
      mode: "replace",
      reason: "clear_stay_type",
      replyHintKo: "숙소 타입을 바꿔 다시 찾았어요",
    };
  }

  if (CLEAR_LANDMARK_FIND_RE.test(text)) {
    return {
      mode: "replace",
      reason: "clear_research",
      replyHintKo: "명소를 찾아 작업장에 넣었어요",
    };
  }

  if (CLEAR_LOCATION_RE.test(text)) {
    return {
      mode: "replace",
      reason: "clear_location",
      replyHintKo: "위치를 반영해 후보를 다시 찾았어요",
    };
  }

  const hardPrice = parseMaxNightlyPriceKrw(text);
  if (
    hardPrice != null &&
    /찾|다시|보여|검색|미만|이하|대로|아래/iu.test(text)
  ) {
    return {
      mode: "replace",
      reason: "clear_hard_price",
      replyHintKo: "가격 기준으로 후보를 다시 찾았어요",
    };
  }

  if (isSameProjectReSearchUtterance(text) || CLEAR_RESEARCH_RE.test(text)) {
    return {
      mode: "replace",
      reason: "clear_research",
      replyHintKo: "조건을 반영해 후보를 다시 찾았어요",
    };
  }

  // Soft refine — even when no candidates yet, mode is refine (handler may no-op).
  if (SOFT_REFINE_RE.test(text)) {
    return {
      mode: "refine",
      reason: /상위|이\s*중|그중|필터/iu.test(text)
        ? "soft_filter"
        : "soft_rank",
      replyHintKo: input.hasVisibleCandidates
        ? "지금 후보 안에서 다시 골랐어요"
        : null,
    };
  }

  return { mode: "none", reason: "none", replyHintKo: null };
}
