/**
 * Resolve InteractionMode + soft/hard + surface from utterance + context.
 * Deterministic regex gates — feeds NL intent_parser, does not replace tool_router.
 */

import { extractTravelDestination } from "@/lib/experience-run/extract-travel-destination";
import {
  parseDurationDaysFromText,
} from "@/lib/experience-run/travel-context-slots";
import { classifyActionVerb } from "@/lib/rimvio-command/action-verb";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import type {
  IntentContextState,
  IntentDomain,
  IntentRoute,
  IntentSurface,
  InteractionMode,
} from "@/lib/intent-router/types";

const NIGHTS_DAYS = /(\d{1,2})\s*박\s*(\d{1,2})\s*일/iu;
const NIGHTS_ONLY = /(\d{1,2})\s*박(?!\s*\d)/iu;

const HARD_CREATE =
  /만들(?:어|어\s*줘|어줘|어\s*주세요|자)?|생성(?:해|해\s*줘)?|준비해(?:줘|요|놔|주세요)?|알아서\s*준비|여행\s*준비|여행\s*계획|일정\s*(?:짜|세워|만들)|trip\s*prep|create\s*(?:a\s*)?(?:trip|project)/iu;

const SOFT_TRIP_DECLARE =
  /갈\s*(?:거야|게|래|예정입니다)|가고\s*싶|갈\s*예정|떠나(?:려|고)|여행\s*(?:갈|가려|할)|놀러\s*갈|trip\s*(?:soon|planned)|will\s*(?:go|travel)/iu;

/** 「추천 일정」 — Reality Draft, not plain explore dump. */
const ITINERARY_DRAFT_CUE =
  /추천\s*일정|일정\s*추천|여행\s*일정|itinerary|스케줄\s*(?:짜|만들|추천)/iu;

const TRIP_CUE = /여행|출장|trip|abroad|놀러|휴가/iu;

const EXECUTE_CUE =
  /예약해(?:줘|요|주세요)?|예매|결제|사줘|구매해|부킹|reserve|book(?:ing)?|purchase|pay/iu;

const EXPLORE_CUE =
  /알려줘|추천해|보여줘|찾아줘|검색|어디|주변|근처|find|recommend|show|search/iu;

const MANAGE_CUE =
  /바꿔줘|수정해|일정\s*바|추가해|빼줘|지워|변경|edit|update|revise|change/iu;

function normalize(text: string): string {
  return text.trim().replace(/\s+/gu, " ");
}

function stayLabelFrom(text: string): string | null {
  const m = text.match(NIGHTS_DAYS);
  if (m) return `${m[1]}박${m[2]}일`;
  const n = text.match(NIGHTS_ONLY);
  if (n) return `${n[1]}박`;
  const days = parseDurationDaysFromText(text);
  if (days != null && days > 0) return `${days}일`;
  return null;
}

function hasDuration(text: string): boolean {
  return stayLabelFrom(text) != null;
}

function resolveDomain(text: string): IntentDomain {
  if (/주식|증권|투자|시총|finance|stock|etf/iu.test(text)) return "finance";
  if (/부동산|아파트|매매|전세|real\s*estate/iu.test(text)) return "real_estate";
  if (/아이폰|쇼핑|사줘|쿠팡|shopping|buy/iu.test(text) && !TRIP_CUE.test(text)) {
    return "shopping";
  }
  if (/건강|병원|운동|health/iu.test(text)) return "health";
  if (/회사|업무|미팅|work\b|meeting/iu.test(text) && !TRIP_CUE.test(text)) {
    return "work";
  }
  if (/공부|강의|education|study/iu.test(text)) return "education";
  if (
    TRIP_CUE.test(text) ||
    /호텔|숙소|항공|맛집|관광|오사카|제주|도쿄|osaka|jeju/iu.test(text)
  ) {
    return "travel";
  }
  return "general";
}

function contextStateFor(contextEventId: string | null | undefined): IntentContextState {
  const id = contextEventId?.trim() ?? "";
  if (!id) return "none";
  const ws = readContextWorkspace(id);
  if (
    ws &&
    (ws.status === "editing" || ws.status === "committing") &&
    ws.nodes.some((n) => n.visible)
  ) {
    return "active_project";
  }
  return "none";
}

function surfaceFor(
  mode: InteractionMode,
  confidence: IntentRoute["confidence"],
  contextState: IntentContextState,
): IntentSurface {
  if (mode === "create" && confidence === "soft") return "soft_propose";
  if (mode === "create" && confidence === "draft") return "draft_preview";
  if (mode === "create" && confidence === "hard") return "workspace";
  if (mode === "manage" || (mode === "explore" && contextState === "active_project")) {
    return "workspace";
  }
  if (mode === "explore") return "globe_explore";
  if (mode === "execute") return "execute_queue";
  return "chat";
}

/**
 * Primary Intent Router — call at NL / Agent ingress before hard surface open.
 */
export function resolveIntentRoute(input: {
  readonly utterance: string;
  readonly contextEventId?: string | null;
}): IntentRoute {
  const text = normalize(input.utterance);
  const domain = resolveDomain(text);
  const contextState = contextStateFor(input.contextEventId);
  const dest = extractTravelDestination(text);
  const stay = stayLabelFrom(text);
  const verb = classifyActionVerb(text);
  const tripShaped =
    domain === "travel" &&
    Boolean(dest) &&
    (hasDuration(text) || TRIP_CUE.test(text));

  // EXECUTE first — never invent CREATE from book verbs.
  if (EXECUTE_CUE.test(text) || verb === "book" || verb === "action") {
    return {
      mode: "execute",
      domain,
      confidence: "hard",
      contextState,
      action: "execute",
      surface: "execute_queue",
      destinationKo: dest,
      stayLabelKo: stay,
      reasonKo: "실행·예약 동사",
    };
  }

  // MANAGE / active project patch
  if (
    contextState === "active_project" &&
    (MANAGE_CUE.test(text) || verb === "edit" || EXPLORE_CUE.test(text))
  ) {
    const addEntity = EXPLORE_CUE.test(text) || verb === "search";
    return {
      mode: addEntity ? "explore" : "manage",
      domain,
      confidence: "hard",
      contextState,
      action: addEntity ? "add_entity" : "project_update",
      surface: "workspace",
      destinationKo: dest,
      stayLabelKo: stay,
      reasonKo: addEntity
        ? "열린 Context에 장소 추가"
        : "열린 Context 수정",
    };
  }

  // HARD CREATE — explicit make/prep
  if (HARD_CREATE.test(text) || verb === "create" || verb === "prepare") {
    if (tripShaped || domain === "travel") {
      return {
        mode: "create",
        domain: domain === "general" ? "travel" : domain,
        confidence: "hard",
        contextState,
        action: "create_project",
        surface: "workspace",
        destinationKo: dest,
        stayLabelKo: stay,
        reasonKo: "만들기·준비 동사",
      };
    }
    return {
      mode: "create",
      domain,
      confidence: "hard",
      contextState,
      action: "create_project",
      surface: "workspace",
      destinationKo: dest,
      stayLabelKo: stay,
      reasonKo: "만들기 동사",
    };
  }

  // DRAFT CREATE — declarative trip OR 추천 일정 → Reality Draft on map
  if (
    tripShaped &&
    hasDuration(text) &&
    (SOFT_TRIP_DECLARE.test(text) || ITINERARY_DRAFT_CUE.test(text)) &&
    !HARD_CREATE.test(text) &&
    !EXECUTE_CUE.test(text)
  ) {
    return {
      mode: "create",
      domain: "travel",
      confidence: "draft",
      contextState,
      action: "create_project",
      surface: "draft_preview",
      destinationKo: dest,
      stayLabelKo: stay,
      reasonKo: ITINERARY_DRAFT_CUE.test(text)
        ? "추천 일정 · Reality Draft"
        : "여행 선언 · Reality Draft",
    };
  }

  // SOFT CREATE — dest+duration trip cue without declare verb (lighter propose)
  if (
    tripShaped &&
    hasDuration(text) &&
    TRIP_CUE.test(text) &&
    !EXPLORE_CUE.test(text) &&
    !HARD_CREATE.test(text) &&
    !EXECUTE_CUE.test(text) &&
    verb == null
  ) {
    return {
      mode: "create",
      domain: "travel",
      confidence: "soft",
      contextState,
      action: "create_project",
      surface: "soft_propose",
      destinationKo: dest,
      stayLabelKo: stay,
      reasonKo: "여행·기간 언급 · Soft 제안",
    };
  }

  // EXPLORE
  if (EXPLORE_CUE.test(text) || verb === "search") {
    return {
      mode: "explore",
      domain,
      confidence: "hard",
      contextState,
      action: "explore",
      surface:
        contextState === "active_project" ? "workspace" : "globe_explore",
      destinationKo: dest,
      stayLabelKo: stay,
      reasonKo: "탐색·추천 동사",
    };
  }

  // CHAT fallback
  return {
    mode: "chat",
    domain,
    confidence: "soft",
    contextState,
    action: "chat",
    surface: "chat",
    destinationKo: dest,
    stayLabelKo: stay,
    reasonKo: "대화·기타",
  };
}
