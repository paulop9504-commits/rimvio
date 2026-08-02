/**
 * Workspace Intent Resolution — NL → Intent (Draft Environment).
 * Commit intents never returned (Field / Reality Commit only).
 */

import { parseWorkspaceUtteranceTransition } from "@/lib/context-workspace/apply-workspace-transition";
import type {
  WorkspaceCommand,
  WorkspaceIntent,
  WorkspaceIntentAction,
} from "@/lib/workspace-command/types";

function intent(
  action: WorkspaceIntentAction,
  target: string,
  parameters: Record<string, unknown> = {},
): WorkspaceIntent {
  return { action, target, parameters };
}

/**
 * Resolve NL → Workspace Intent.
 * "캡슐호텔만 보고 싶어" → modify_context hotel { hotelType: "capsule" }
 */
export function resolveWorkspaceIntent(
  command: WorkspaceCommand,
  options?: { readonly targetObjectId?: string | null },
): WorkspaceIntent | null {
  const text = command.rawText.trim();
  if (!text) return null;

  const defaultTarget =
    options?.targetObjectId?.trim() ||
    command.workspaceId ||
    "workspace";

  // create_draft / prepare
  if (/예약\s*준비|prepare|준비\s*해|액션\s*준비|create\s*draft/iu.test(text)) {
    if (/draft|초안|드래프트/iu.test(text) && !/예약/u.test(text)) {
      return intent("create_draft", defaultTarget, { labelKo: "Draft 생성" });
    }
    return intent("prepare", defaultTarget, { labelKo: "예약 준비" });
  }

  // analyze_context
  if (/분석|analyze|영향\s*분석|어때\s*보일/iu.test(text) && !/바꾸면/u.test(text)) {
    return intent("analyze_context", defaultTarget, { utterance: text });
  }

  // optimize_context
  if (/최적화|optimize|동선\s*최적화|가성비\s*최적/iu.test(text)) {
    return intent("optimize_context", defaultTarget, {
      optimizeRoute: true,
      utterance: text,
    });
  }

  // remove_constraint
  if (
    /가격\s*조건\s*빼|조건\s*빼|제약\s*해제|필터\s*해제|constraint\s*off|clear\s*filter/iu.test(
      text,
    )
  ) {
    return intent("remove_constraint", defaultTarget, {
      clear: true,
      key: /가격/u.test(text) ? "price" : null,
    });
  }

  // modify_context — capsule (primary Reality OS path)
  if (/캡슐\s*호텔|capsule\s*hotel|캡슐만|capsule\s*only/iu.test(text)) {
    return intent("modify_context", "hotel", {
      hotelType: "capsule",
      category: "capsule",
    });
  }

  // modify_context / filter — cheap hotels
  if (/저렴한?\s*호텔|싼\s*호텔|가성비\s*호텔|cheap\s*hotel|가격\s*\d+/iu.test(text)) {
    const priceM = text.match(/(\d+)\s*만/);
    return intent("modify_context", "hotel", {
      maxPriceBand: 2,
      maxPriceWon: priceM?.[1] ? Number(priceM[1]) * 10000 : null,
      filter: { maxPriceBand: 2 },
    });
  }

  // add_constraint — near station
  if (
    /가까운\s*곳|근처|역세권|near|가까이/iu.test(text) ||
    /난바|namba|역\s*가깝/iu.test(text)
  ) {
    const station =
      text.match(/(난바|도톤보리|신사이바시|우메다|오사카|namba)[역\s]*/iu)?.[1] ??
      "근처";
    return intent("add_constraint", "hotel", {
      near: station,
      stationNear: true,
      utterance: text,
    });
  }

  // compare
  if (/두\s*호텔\s*비교|호텔\s*비교|비교해|compare/iu.test(text)) {
    return intent("compare", "hotel", {});
  }

  // simulate
  if (
    /바꾸면\s*영향|영향\s*알려|시뮬레이션|what\s*-?\s*if|만약/iu.test(text)
  ) {
    return intent("simulate", defaultTarget, {
      simulateScenarioKo: text,
    });
  }

  // move
  if (
    /마지막\s*날|첫째\s*날|둘째\s*날|일정\s*넣|USJ|유니버설/iu.test(text) ||
    (/옮겨|이동|순서|동선|move|reorder/iu.test(text) &&
      !/바꿔|교체/iu.test(text))
  ) {
    return intent("move", defaultTarget, {
      dayHint: text,
      utterance: text,
    });
  }

  // replace
  if (
    /이\s*호텔\s*말고|다른\s*곳|다른\s*호텔|바꿔|교체|대체|replace|말고\s*다른/iu.test(
      text,
    )
  ) {
    return intent("replace", "hotel", {
      findSimilar: true,
      utterance: text,
    });
  }

  if (
    /조건\s*추가|제약\s*넣|constraint|이\s*조건|필터\s*추가/iu.test(text)
  ) {
    return intent("add_constraint", defaultTarget, { utterance: text });
  }

  // generic modify_context for "만 보고/보여"
  if (/만\s*보|만\s*보여|만\s*표시|only\s*show/iu.test(text)) {
    return intent("modify_context", "hotel", { utterance: text });
  }

  const parsed = parseWorkspaceUtteranceTransition(text);
  if (!parsed) return null;
  if (parsed.op === "commit") return null;

  switch (parsed.op) {
    case "filter":
    case "sort":
      return intent("modify_context", "hotel", {
        filter: parsed.filter ?? null,
        sortBy: parsed.sortBy ?? null,
        maxPriceBand: parsed.filter?.maxPriceBand ?? null,
        hotelType: parsed.filter?.tagIncludes?.includes("stay:capsule")
          ? "capsule"
          : null,
      });
    case "compare":
      return intent("compare", "hotel", {});
    case "simulate":
      return intent("simulate", defaultTarget, {
        simulateScenarioKo: parsed.simulateScenarioKo ?? text,
      });
    case "optimize_route":
      return intent("optimize_context", defaultTarget, {
        optimizeRoute: true,
      });
    case "find_similar":
      return intent("replace", "hotel", { findSimilar: true });
    case "remove":
      return intent("replace", defaultTarget, { remove: true });
    case "bookmark":
      return intent("add_constraint", defaultTarget, {
        pin: parsed.pin ?? true,
      });
    case "undo":
    case "redo":
      return intent("filter", defaultTarget, { historyOp: parsed.op });
    default:
      return null;
  }
}

export function looksLikeForbiddenGlobeCommit(rawText: string): boolean {
  const text = rawText.trim();
  if (
    /캡슐|저렴|비교|준비|영향|가까운|조건\s*빼|말고\s*다른|최적화|분석|만\s*보/u.test(
      text,
    )
  ) {
    return false;
  }
  return /commit|확정|지구에\s*남|커밋|reality\s*commit/iu.test(text);
}
