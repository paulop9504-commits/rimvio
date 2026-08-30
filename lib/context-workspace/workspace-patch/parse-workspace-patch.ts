/**
 * NL → Workspace Patch (never Answer).
 */

import type { WorkspacePatch } from "@/lib/context-workspace/workspace-patch/types";
import { parseLodgingStayTypeFromText } from "@/lib/globe/lodging/lodging-stay-types";
import { parseMaxNightlyPriceKrw } from "@/lib/globe/context-condition-ai/filter-lodging-for-intent";
import { parseOrdinalIndex } from "@/lib/graph-command/resolve-selection-ref";
import {
  isWorkspaceNlControlUtterance,
  parseCuisineFromText,
  parseMinRatingFromText,
} from "@/lib/context-workspace/workspace-nl-control";

function dayMovePatch(input: {
  readonly dayIndex: number;
  readonly utterance: string;
}): WorkspacePatch {
  const ordinalIndex = parseOrdinalIndex(input.utterance);
  // Prefer ordinal / explicit id; only keep a proper place name as queryIncludes.
  let label: string | null = null;
  if (ordinalIndex == null) {
    label =
      input.utterance
        .match(
          /^([\uac00-\ud7a3A-Za-z0-9·\s]{2,24}?)\s*(?:을|를)?\s*(?:day\s*|데이\s*|Day\s*)\d+/iu,
        )?.[1]
        ?.trim() || null;
    if (label && /^(?:그거|이거|저거|호텔|숙소|맛집|식당|카페|장소)$/u.test(label)) {
      label = null;
    }
  }
  return {
    kind: "move_schedule",
    dayIndex: input.dayIndex,
    entityId: null,
    ordinalIndex,
    queryIncludes: label && label.length >= 2 ? label : null,
  };
}

function parseKeepTopN(text: string): number | null {
  const topMatch = text.match(
    /(?:상위\s*)?(\d+)\s*개|(?:만\s*)?(\d+)\s*개\s*(?:만|보여|남|골라)|(\d+)\s*곳\s*(?:만|보여|남|골라)/u,
  );
  if (!topMatch) return null;
  const n = Number(topMatch[1] || topMatch[2] || topMatch[3]);
  if (!Number.isFinite(n) || n < 1 || n > 20) return null;
  return n;
}

/**
 * Parse utterance into a single Workspace Patch.
 * Returns null when no patchable intent (caller may fall through to tools).
 */
export function parseWorkspacePatch(utterance: string): WorkspacePatch | null {
  const text = utterance.trim();
  if (!text) return null;

  // 「2번을 Day 2에 넣어줘」 / 「Day2로 옮겨」 / 「Day 1 숙소로 넣어」
  const dayMove = text.match(
    /(?:day\s*|데이\s*|Day\s*)(\d+)\s*(?:일차)?\s*(?:숙소(?:로)?|일정(?:으로|에)?|에|로)?\s*(?:옮|넣어|추가|배정)/iu,
  );
  if (dayMove?.[1]) {
    const dayIndex = Math.max(0, Number(dayMove[1]) - 1);
    return dayMovePatch({ dayIndex, utterance: text });
  }
  if (/일정\s*(?:에\s*)?넣|스케줄\s*(?:에\s*)?넣/iu.test(text)) {
    const d = text.match(/(\d+)\s*일차?/);
    return dayMovePatch({
      dayIndex: d?.[1] ? Math.max(0, Number(d[1]) - 1) : 1,
      utterance: text,
    });
  }

  // L4 — ordinal delete against visible list order (before Day remove / soft).
  {
    const deleteCue = /빼|삭제|지워|제외|없애/iu.test(text);
    const ordinalIndex = parseOrdinalIndex(text);
    if (deleteCue && ordinalIndex != null) {
      return {
        kind: "delete_entity",
        entityIds: [],
        ordinalIndex,
      };
    }
  }

  // Day B — remove from day schedule (requires explicit Day cue — not 「2번」)
  {
    const dayRm = text.match(
      /(?:day\s*|데이\s*|Day\s*)(\d+)\s*(?:일차|일)?|(?:(\d+)\s*일차)/iu,
    );
    if (
      (dayRm?.[1] || dayRm?.[2]) &&
      /빼|삭제|지워|제외|없애/iu.test(text) &&
      !/넣|추가|바꿔|교체|찾아/iu.test(text) &&
      !/\d+\s*번/u.test(text)
    ) {
      const dayIndex = Math.max(
        0,
        Number(dayRm[1] || dayRm[2]) - 1,
      );
      const label =
        text
          .match(
            /([\uac00-\ud7a3A-Za-z0-9·]{2,16})\s*(?:는|은|을|를)?\s*(?:빼|삭제|지워|제외|없애)/u,
          )?.[1]
          ?.trim() ||
        text
          .match(
            /(?:에서|의)\s*([\uac00-\ud7a3A-Za-z0-9·]{2,16})\s*(?:를|을)?\s*(?:빼|삭제|지워)/u,
          )?.[1]
          ?.trim() ||
        null;
      if (label && !/^(?:day|데이|일정|일차)$/iu.test(label)) {
        return {
          kind: "remove_schedule",
          dayIndex,
          entityId: null,
          queryIncludes: label,
        };
      }
    }
  }

  // Day B — rebuild day route
  if (
    /(?:day\s*|데이\s*|Day\s*)?(\d+)\s*(?:일차|일)?/iu.test(text) &&
    /동선|루트|이동\s*(?:을\s*)?(?:다시|재)|route\s*rebuild/iu.test(text)
  ) {
    const d = text.match(/(?:day\s*|데이\s*|Day\s*)?(\d+)\s*(?:일차|일)?/iu);
    return {
      kind: "rebuild_route",
      dayIndex: Math.max(0, Number(d?.[1] ?? "1") - 1),
    };
  }

  // Soft refine in-set — FILTER, never wipe inventory (P0).
  // Explicit「다시 찾아」만 replace_entity로 재검색.
  // P1: cold compound (near + find + hotel) → spatial first so Discovery runs;
  //     soft facets ride ConstraintMemory via P1 guards on that scout.
  // L4: 「남겨」「N개만」「그중 … 이하만」also soft.
  // Click ≡ NL: 「한식만 보여줘」·「2만원 이하」·「4.5점 이상」.
  {
    const cuisine = parseCuisineFromText(text);
    const minRatingNl = parseMinRatingFromText(text);
    const priceCap = parseMaxNightlyPriceKrw(text);
    const nlControl = isWorkspaceNlControlUtterance(text);
    const softCheap =
      /더\s*싼|더\s*싸|저렴한\s*순|가성비|싼\s*순|cheap|cheaper/iu.test(text);
    const softInSet =
      /이\s*중|그중|그\s*중|필터|정렬|가까운\s*순|평점\s*높|별점\s*높|상위\s*\d|남겨|남기|\d+\s*개\s*만|\d+\s*곳\s*만/iu.test(
        text,
      );
    const explicitRescout =
      /다시\s*(?:찾|보여|검색|골라)|다른\s*(?:거|곳|호텔|숙소)/iu.test(text);
    const hasSpatialCue =
      /역\s*근처|역앞|역세권|([가-힣A-Za-z0-9]+역)\s*(근처|주변|앞|에서)/u.test(
        text,
      ) ||
      (/근처|주변|near/iu.test(text) &&
        /난바|도톤|우메다|namba|umeda|USJ|유니버설|유니버셜/iu.test(text));
    const wantsFind =
      /찾아|검색|보여|해줘|호텔|숙소|lodging|hotel/iu.test(text);
    const softOnlyDeixis = /이\s*중|그중|그\s*중|남겨|남기/iu.test(text);
    /** Cold compound — scout + constraints, not in-set filter alone. */
    const coldCompound =
      hasSpatialCue && wantsFind && !softOnlyDeixis && !explicitRescout;

    if (
      (softCheap || softInSet || nlControl) &&
      !explicitRescout &&
      !coldCompound
    ) {
      const keepTopN = parseKeepTopN(text);
      const maxNightly =
        priceCap != null &&
        (softInSet ||
          nlControl ||
          /남겨|남기|만\s*(?:남겨|남기|보여|골라|해줘)/iu.test(text))
          ? priceCap
          : null;
      const wantsValue = softCheap || /가성비|싼\s*순/iu.test(text);
      const wantsRating =
        minRatingNl != null || /평점\s*높|별점\s*높|rating/iu.test(text);
      const wantsNear = /가까운\s*순/iu.test(text);
      return {
        kind: "filter_entity",
        filter: {
          // Soft refine never hard-caps priceBand to force rescout wipe.
          ...(minRatingNl != null
            ? { minRating: minRatingNl }
            : wantsRating
              ? { minRating: 4 }
              : {}),
          ...(cuisine
            ? {
                tagIncludes: [cuisine.tag],
                queryIncludes: cuisine.needles[0] ?? null,
              }
            : {}),
          ...(keepTopN != null ? { keepTopN } : {}),
          ...(maxNightly != null ? { maxNightlyPriceKrw: maxNightly } : {}),
          ...(wantsValue && keepTopN == null && maxNightly == null
            ? { relativeCheaper: true }
            : {}),
          sortBy: wantsValue
            ? "value"
            : wantsRating || minRatingNl != null
              ? "rating"
              : wantsNear
                ? "value"
                : null,
        },
      };
    }

    // Explicit re-search with cheap cue → Replace Entity
    if (softCheap && explicitRescout) {
      return {
        kind: "replace_entity",
        domain: /맛집|식당|restaurant/iu.test(text) ? "eatery" : "lodging",
        cheaper: true,
        query: text,
      };
    }
  }

  // "난바역 근처" / "역 근처" → Spatial Constraint Patch
  // Compound: 「교바시역 근처 캡슐호텔」keeps stayType on the same patch.
  if (
    /역\s*근처|역앞|역세권|station\s*near|near\s*(the\s*)?station/iu.test(text) ||
    /([가-힣A-Za-z0-9]+역)\s*(근처|주변|앞)/u.test(text)
  ) {
    const named = text.match(/([가-힣A-Za-z0-9]+역)/u);
    const stayType = parseLodgingStayTypeFromText(text);
    return {
      kind: "spatial_constraint",
      nearLabelKo: named?.[1]?.trim() || "역",
      stationNear: true,
      meters: 800,
      stayType: stayType ?? null,
    };
  }
  if (/근처|주변|near/iu.test(text) && /난바|도톤|우메다|namba|umeda/iu.test(text)) {
    const place =
      text.match(/(난바|도톤보리|우메다|Namba|Umeda)/iu)?.[1] ?? "근처";
    const stayType = parseLodgingStayTypeFromText(text);
    return {
      kind: "spatial_constraint",
      nearLabelKo: place,
      stationNear: /역/u.test(text),
      meters: 1000,
      stayType: stayType ?? null,
    };
  }

  // Reality Anchor — USJ / Universal near lodging (not station)
  if (
    /근처|주변|near/iu.test(text) &&
    /USJ|유니버설|유니버셜|universal/iu.test(text)
  ) {
    const stayType = parseLodgingStayTypeFromText(text);
    return {
      kind: "spatial_constraint",
      nearLabelKo: "유니버설 스튜디오 재팬",
      stationNear: false,
      meters: 1500,
      stayType: stayType ?? null,
    };
  }

  // Stay-type — soft「만 보여」= in-set filter; 「찾아」= replace rescout
  const stayType = parseLodgingStayTypeFromText(text);
  if (stayType) {
    const softStayOnly =
      /만\s*(?:보|해|줘|남)|위주/iu.test(text) &&
      !/찾아|검색|다시|바꿔|교체/iu.test(text);
    if (softStayOnly) {
      return {
        kind: "filter_entity",
        filter: {
          tagIncludes: [`stay:${stayType}`],
        },
      };
    }
    const wantsStay =
      /만\s*(보|해|줘)|위주|바꿔|바꾸|선호|보여|찾아|검색|해줘|보여줘|로\s*해|으로\s*해/iu.test(
        text,
      ) || stayType !== "hotel";
    if (wantsStay) {
      return {
        kind: "replace_entity",
        domain: "lodging",
        stayType,
        query: text,
      };
    }
  }

  // Delete (selected / explicit ids — ordinal already handled above)
  if (/빼|삭제|지워|제외|없애/iu.test(text)) {
    return { kind: "delete_entity", entityIds: [] };
  }

  // Simulation
  if (/시뮬|시뮬레이션|what\s*if|가정해/iu.test(text)) {
    return { kind: "simulation", scenarioKo: text };
  }

  // Create draft
  if (/드래프트|draft|초안\s*만들|준비\s*해/iu.test(text)) {
    return { kind: "create_draft", labelKo: text };
  }

  // Connect / compare
  if (/비교|connect|연결해/iu.test(text)) {
    return {
      kind: "connect_entity",
      fromId: "",
      toId: "",
      relation: "compare",
      labelKo: "비교",
    };
  }

  return null;
}
