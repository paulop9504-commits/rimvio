/**
 * Compile NL → Workspace Agent Plan (ordered steps).
 * Skeleton: detect A/B/C-ish compounds; otherwise single step.
 * Step runners still use existing Agent Loop tools — no parallel scout stack.
 */

import {
  WORKSPACE_AGENT_PLAN_VERSION,
  type WorkspaceAgentPlan,
  type WorkspaceAgentPlanKind,
  type WorkspaceAgentPlanStep,
} from "@/lib/context-run/workspace-agent-plan";
import { parseWorkspacePatch } from "@/lib/context-workspace/workspace-patch";
import { isSpatialDiscoveryUtterance } from "@/lib/spatial-retrieval/apply-spatial-discovery-to-workspace";

function stepId(i: number): string {
  return `ws_step_${i + 1}`;
}

function mkStep(input: {
  readonly index: number;
  readonly kind: WorkspaceAgentPlanStep["kind"];
  readonly labelKo: string;
  readonly utterance: string;
  readonly noteKo?: string | null;
  readonly expect?: WorkspaceAgentPlanStep["expect"];
}): WorkspaceAgentPlanStep {
  return {
    id: stepId(input.index),
    kind: input.kind,
    labelKo: input.labelKo,
    utterance: input.utterance.trim(),
    status: "pending",
    noteKo: input.noteKo ?? null,
    expect: input.expect,
    observation: null,
  };
}

function detectPlanKind(text: string): WorkspaceAgentPlanKind {
  // B — Day modify
  if (
    /(?:day\s*|데이\s*|)\d+\s*(?:일차|일)?/iu.test(text) &&
    /빼|빼고|삭제|지워/iu.test(text) &&
    /넣|추가|바꿔|교체/iu.test(text)
  ) {
    return "day_modify_b";
  }
  // P5 acceptance — Scout → Top-N → Day (no food required)
  if (
    /(?:호텔|숙소)/iu.test(text) &&
    /(?:가성비|이\s*중|그중|그\s*중|\d+\s*개)/iu.test(text) &&
    /(?:day\s*|데이\s*|\d+\s*일차)/iu.test(text) &&
    /(?:넣어|넣고|추가|배치)/iu.test(text)
  ) {
    return "scout_refine_day";
  }
  // C — hotel pick + day + eatery (+ route)
  if (
    /(?:호텔|숙소)/iu.test(text) &&
    /(?:맛집|저녁|식당|카페)/iu.test(text) &&
    /(?:day\s*1|1일차|일정|넣어|넣고|추가)/iu.test(text)
  ) {
    return "compound_c";
  }
  // A — also add another lodging near landmark
  if (
    /(?:도|추가로|같이).{0,8}(?:호텔|숙소)/iu.test(text) &&
    /(?:usj|유니버설|근처)/iu.test(text)
  ) {
    return "add_a";
  }
  // Refine chain in one breath
  if (
    /(?:이\s*중|그중|그\s*중)/iu.test(text) &&
    /(?:남겨|골라|보여|3개|비교)/iu.test(text)
  ) {
    return "refine_chain";
  }
  return "single";
}

function extractDayNumber(text: string): number {
  const m = text.match(/(?:day\s*|데이\s*)(\d+)|\b(\d+)\s*일차/iu);
  const n = Number(m?.[1] || m?.[2] || "2");
  return Number.isFinite(n) && n >= 1 && n <= 14 ? n : 2;
}

function extractKeepTopN(text: string): number {
  const m = text.match(
    /(?:상위\s*)?(\d+)\s*개|(?:만\s*)?(\d+)\s*개\s*(?:만|보여|남|골라)/u,
  );
  const n = Number(m?.[1] || m?.[2] || "3");
  return Number.isFinite(n) && n >= 2 && n <= 5 ? n : 3;
}

function extractNearScoutHotel(text: string): string {
  const station = text.match(/([가-힣A-Za-z0-9]+역)/u)?.[1];
  if (station) return `${station} 근처 호텔 찾아줘`;
  const area = text.match(
    /(난바|도톤보리|우메다|신사이바시|Namba|Umeda)/iu,
  )?.[1];
  if (area) return `${area} 근처 호텔 찾아줘`;
  return "호텔 찾아줘";
}

function compileScoutRefineDay(text: string): WorkspaceAgentPlanStep[] {
  const day = extractDayNumber(text);
  const keepN = extractKeepTopN(text);
  const scout = extractNearScoutHotel(text);

  return [
    mkStep({
      index: 0,
      kind: "workspace_prompt",
      labelKo: "호텔 검색",
      utterance: scout,
      noteKo: "P5 · scout lodging",
      expect: {
        workspaceMutated: true,
        requireVisibleDomain: true,
        target: "lodging",
        minVisible: 1,
      },
    }),
    mkStep({
      index: 1,
      kind: "workspace_patch",
      labelKo: `가성비 TOP ${keepN}`,
      utterance: `이중에 가성비 좋은 것만 ${keepN}개`,
      noteKo: "P5 · soft refine + compare",
      expect: {
        workspaceMutated: true,
        target: "lodging",
        minVisible: 1,
      },
    }),
    mkStep({
      index: 2,
      kind: "workspace_patch",
      labelKo: `Day ${day}에 넣기`,
      utterance: `첫 번째 호텔을 Day ${day}에 넣어줘`,
      noteKo: "P5 · move_schedule",
      expect: {
        workspaceMutated: true,
        requireDay: day,
      },
    }),
    mkStep({
      index: 3,
      kind: "workspace_patch",
      labelKo: `Day ${day} 동선`,
      utterance: `Day ${day} 이동 동선 다시 짜줘`,
      noteKo: "P5 · rebuild_route",
      expect: { workspaceMutated: true },
    }),
  ];
}

function resolveStepKind(utterance: string): WorkspaceAgentPlanStep["kind"] {
  if (parseWorkspacePatch(utterance)) return "workspace_patch";
  if (isSpatialDiscoveryUtterance(utterance)) return "spatial_discovery";
  if (/예약\s*준비|prepare/iu.test(utterance)) return "reality_prepare";
  return "workspace_prompt";
}

function compileDayModifyB(text: string): WorkspaceAgentPlanStep[] {
  const dayMatch = text.match(/(?:day\s*|데이\s*)?(\d+)\s*(?:일차|일)?/iu);
  const day = dayMatch?.[1] ?? "2";
  const removeMatch = text.match(
    /([\uac00-\ud7a3A-Za-z0-9·]{2,12})\s*(?:는|은|을|를)?\s*빼/u,
  );
  const addMatch = text.match(
    /([\uac00-\ud7a3A-Za-z0-9·]{2,12})\s*(?:을|를|를)?\s*(?:넣|추가)/u,
  );
  const removeLabel = removeMatch?.[1]?.trim() || "해당 장소";
  const addLabel = addMatch?.[1]?.trim() || "대체 장소";

  return [
    mkStep({
      index: 0,
      kind: "workspace_patch",
      labelKo: `Day ${day} · ${removeLabel} 제거`,
      utterance: `Day ${day}에서 ${removeLabel} 빼줘`,
      noteKo: "B · remove_schedule",
      expect: { workspaceMutated: true },
    }),
    mkStep({
      index: 1,
      kind: "workspace_patch",
      labelKo: `${addLabel} 검색·추가`,
      utterance: `${addLabel}을 Day ${day}에 넣어줘`,
      noteKo: "B · move_schedule add",
      expect: { workspaceMutated: true },
    }),
    mkStep({
      index: 2,
      kind: "workspace_patch",
      labelKo: `Day ${day} 동선 다시`,
      utterance: `Day ${day} 이동 동선 다시 짜줘`,
      noteKo: "B · rebuild_route",
      expect: { workspaceMutated: true },
    }),
  ];
}

function compileCompoundC(text: string): WorkspaceAgentPlanStep[] {
  const hotelPart =
    text.match(
      /([^.]{0,48}(?:호텔|숙소)[^.]{0,40}?(?:골라|찾아|하나)?)/iu,
    )?.[1]?.trim() || "난바역 근처 호텔 하나 찾아줘";
  const foodPart =
    text.match(
      /([^.]{0,40}(?:맛집|저녁|식당|카페)[^.]{0,36})/iu,
    )?.[1]?.trim() || "근처 저녁 맛집 찾아줘";
  const softInSet =
    /중\s*(?:에서|에)|이\s*중|그중|그\s*중|골라서|이하|미만|남겨/iu.test(text);
  const budgetLeave =
    softInSet && /만원|만\s*원|이하|미만/iu.test(text)
      ? text.match(
          /(?:그중|그\s*중|이\s*중(?:에서)?|으로)?\s*[^,]{0,24}?(\d+(?:\.\d+)?\s*만\s*원?\s*(?:이하|미만|아래))/u,
        )?.[1] ??
        text.match(/(\d+(?:\.\d+)?\s*만\s*원?\s*(?:이하|미만|아래))/u)?.[1]
      : null;

  if (softInSet) {
    return [
      mkStep({
        index: 0,
        kind: "workspace_patch",
        labelKo: "호텔 후보 선별",
        utterance: budgetLeave
          ? `그중 ${budgetLeave}만 남겨줘`
          : "이중에 가성비 좋은 것만 남겨줘",
        noteKo: "C · soft lodging filter",
        expect: { workspaceMutated: true },
      }),
      mkStep({
        index: 1,
        kind: "workspace_patch",
        labelKo: "Day 1 숙소로 넣기",
        utterance: "첫 번째 호텔을 Day 1 숙소로 넣어줘",
        noteKo: "C · move_schedule lodging",
        expect: { workspaceMutated: true },
      }),
      mkStep({
        index: 2,
        kind: "workspace_patch",
        labelKo: "저녁 맛집 Day 1",
        utterance: /카페/iu.test(foodPart)
          ? "첫 번째 카페를 Day 1에 넣어줘"
          : "첫 번째 맛집을 Day 1에 넣어줘",
        noteKo: "C · move_schedule eatery",
        expect: { workspaceMutated: true },
      }),
      mkStep({
        index: 3,
        kind: "workspace_patch",
        labelKo: "동선 업데이트",
        utterance: "Day 1 이동 동선 다시 짜줘",
        noteKo: "C · rebuild_route",
        expect: { workspaceMutated: true },
      }),
    ];
  }

  return [
    mkStep({
      index: 0,
      kind: resolveStepKind(hotelPart),
      labelKo: "호텔 검색·선별",
      utterance: /찾아|골라|검색/iu.test(hotelPart)
        ? hotelPart
        : `${hotelPart} 찾아줘`,
      noteKo: "C · lodging",
      expect: {
        workspaceMutated: true,
        requireVisibleDomain: true,
        target: "lodging",
      },
    }),
    mkStep({
      index: 1,
      kind: "workspace_patch",
      labelKo: "Day 1 숙소로 넣기",
      utterance: "첫 번째 호텔을 Day 1 숙소로 넣어줘",
      noteKo: "C · move_schedule lodging",
    }),
    mkStep({
      index: 2,
      kind: resolveStepKind(foodPart),
      labelKo: "저녁 맛집 검색",
      utterance: /찾아|추가|넣어/iu.test(foodPart)
        ? foodPart
        : `${foodPart} 찾아 추가해줘`,
      noteKo: "C · eatery",
      expect: {
        workspaceMutated: true,
        requireVisibleDomain: true,
        target: "eatery",
      },
    }),
    mkStep({
      index: 3,
      kind: "workspace_patch",
      labelKo: "동선 업데이트",
      utterance: "Day 1 이동 동선 다시 짜줘",
      noteKo: "C · rebuild_route",
      expect: { workspaceMutated: true },
    }),
  ];
}

function compileRefineChain(text: string): WorkspaceAgentPlanStep[] {
  return [
    mkStep({
      index: 0,
      kind: resolveStepKind(text),
      labelKo: "후보 필터·정렬",
      utterance: text,
      noteKo: "refine · in-set",
      expect: { workspaceMutated: true },
    }),
  ];
}

function compileAddA(text: string): WorkspaceAgentPlanStep[] {
  return [
    mkStep({
      index: 0,
      kind: "workspace_prompt",
      labelKo: "추가 호텔 검색",
      utterance: text,
      noteKo: "A · add lodging",
      expect: {
        workspaceMutated: true,
        requireVisibleDomain: true,
        target: "lodging",
      },
    }),
  ];
}

function compileSingle(text: string): WorkspaceAgentPlanStep[] {
  return [
    mkStep({
      index: 0,
      kind: resolveStepKind(text),
      labelKo: "Workspace 반영",
      utterance: text,
    }),
  ];
}

/**
 * Pure compile — no Workspace write.
 */
export function compileWorkspaceAgentPlan(input: {
  readonly utterance: string;
  readonly contextEventId?: string | null;
}): WorkspaceAgentPlan {
  const text = input.utterance.trim();
  const planKind = detectPlanKind(text);
  let steps: WorkspaceAgentPlanStep[];
  switch (planKind) {
    case "day_modify_b":
      steps = compileDayModifyB(text);
      break;
    case "scout_refine_day":
      steps = compileScoutRefineDay(text);
      break;
    case "compound_c":
      steps = compileCompoundC(text);
      break;
    case "refine_chain":
      steps = compileRefineChain(text);
      break;
    case "add_a":
      steps = compileAddA(text);
      break;
    default:
      steps = compileSingle(text);
  }

  return {
    version: WORKSPACE_AGENT_PLAN_VERSION,
    planId: `wap_${Date.now().toString(36)}`,
    contextEventId: input.contextEventId?.trim() || null,
    sourceUtterance: text,
    planKind,
    steps,
    createdAtIso: new Date().toISOString(),
    cursor: 0,
  };
}
