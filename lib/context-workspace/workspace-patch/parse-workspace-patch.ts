/**
 * NL → Workspace Patch (never Answer).
 */

import type { WorkspacePatch } from "@/lib/context-workspace/workspace-patch/types";
import { parseLodgingStayTypeFromText } from "@/lib/globe/lodging/lodging-stay-types";
import { parseOrdinalIndex } from "@/lib/graph-command/resolve-selection-ref";

function dayMovePatch(input: {
  readonly dayIndex: number;
  readonly utterance: string;
}): WorkspacePatch {
  const ordinalIndex = parseOrdinalIndex(input.utterance);
  return {
    kind: "move_schedule",
    dayIndex: input.dayIndex,
    entityId: null,
    ordinalIndex,
  };
}

/**
 * Parse utterance into a single Workspace Patch.
 * Returns null when no patchable intent (caller may fall through to tools).
 */
export function parseWorkspacePatch(utterance: string): WorkspacePatch | null {
  const text = utterance.trim();
  if (!text) return null;

  // 「2번을 Day 2에 넣어줘」 / 「Day2로 옮겨」 → Move Schedule Patch
  const dayMove = text.match(
    /(?:day\s*|데이\s*|Day\s*)(\d+)\s*(?:로|에)?\s*(?:옮|넣어|추가|배정)/iu,
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

  // "난바역 근처" / "역 근처" → Spatial Constraint Patch
  if (
    /역\s*근처|역앞|역세권|station\s*near|near\s*(the\s*)?station/iu.test(text) ||
    /([가-힣A-Za-z0-9]+역)\s*(근처|주변|앞)/u.test(text)
  ) {
    const named = text.match(/([가-힣A-Za-z0-9]+역)/u);
    return {
      kind: "spatial_constraint",
      nearLabelKo: named?.[1]?.trim() || "역",
      stationNear: true,
      meters: 800,
    };
  }
  if (/근처|주변|near/iu.test(text) && /난바|도톤|우메다|namba|umeda/iu.test(text)) {
    const place =
      text.match(/(난바|도톤보리|우메다|Namba|Umeda)/iu)?.[1] ?? "근처";
    return {
      kind: "spatial_constraint",
      nearLabelKo: place,
      stationNear: /역/u.test(text),
      meters: 1000,
    };
  }

  // Reality Anchor — USJ / Universal near lodging (not station)
  if (
    /근처|주변|near/iu.test(text) &&
    /USJ|유니버설|유니버셜|universal/iu.test(text)
  ) {
    return {
      kind: "spatial_constraint",
      nearLabelKo: "유니버설 스튜디오 재팬",
      stationNear: false,
      meters: 1500,
    };
  }

  // "더 싼 호텔" → Replace Entity Patch
  if (/더\s*싼|더\s*싸|저렴|싼\s*곳|싼\s*호텔|가성비|cheap|cheaper/iu.test(text)) {
    return {
      kind: "replace_entity",
      domain: /맛집|식당|restaurant/iu.test(text) ? "eatery" : "lodging",
      cheaper: true,
      query: text,
    };
  }

  // Stay-type replace / filter ("캡슐호텔만", "캡슐호텔 찾아줘")
  const stayType = parseLodgingStayTypeFromText(text);
  if (stayType) {
    const wantsStay =
      /만\s*(보|해|줘)|위주|바꿔|바꾸|선호|보여|찾아|검색|해줘|보여줘|로\s*해|으로\s*해/iu.test(
        text,
      ) || stayType !== "hotel";
    if (wantsStay) {
      // replace_entity → Reality Patch + rescout (not empty filter-only)
      return {
        kind: "replace_entity",
        domain: "lodging",
        stayType,
        query: text,
      };
    }
  }

  // Delete
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
