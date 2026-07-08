/**
 * Intent Dispatcher (client) — classify every typed input before acting.
 *
 * Sends the message to the classification-only LLM (/api/globe/intent-dispatch)
 * which returns Chat | Search | Task + short reasoning. When no provider is
 * configured or the call fails, falls back to deterministic rules so routing
 * never dead-ends. The caller executes the matching processor.
 */
import { isInstantPoiSearch } from "@/lib/globe/context-condition-ai/instant-poi-search";
import { resolveSmallTalk } from "@/lib/globe/context-condition-ai/resolve-small-talk";

export type DispatchCategory = "chat" | "search" | "task";

export type InputClassification = {
  readonly category: DispatchCategory;
  readonly reasoning: string | null;
  readonly source: "llm" | "deterministic";
};

/** Verbs that mean "make/execute something" rather than look a place up. */
const TASK_CUE =
  /요약|번역|일정|캘린더|알림|리마인|메일|이메일|메모|저장해|추가해|만들어|정리해|공유해|보내줘|예약해|schedule|remind|translate|summari|email/iu;

/** Drink / cafe cravings after small talk — always search, never hotel. */
const BEVERAGE_SEARCH =
  /^(?:음료|음료수|드링크|drink|beverage|커피|coffee|카페|cafe|주스|juice|스무디|smoothie|디저트|dessert)$/iu;

/** Weather / temperature questions — chat with live weather, never place search. */
const WEATHER_CHAT =
  /(기온|온도|체감\s*온도|몇\s*도|temperature|temp\b|날씨\s*어때|날씨\s*알려|지금\s*날씨|현재\s*날씨|현재\s*기온)/iu;

function deterministicClassify(
  text: string,
  region?: string | null,
): InputClassification {
  if (resolveSmallTalk({ text, region })) {
    return { category: "chat", reasoning: "결정론: 스몰토크 패턴", source: "deterministic" };
  }
  if (WEATHER_CHAT.test(text)) {
    return { category: "chat", reasoning: "결정론: 날씨·기온 질문", source: "deterministic" };
  }
  if (BEVERAGE_SEARCH.test(text.trim())) {
    return { category: "search", reasoning: "결정론: 음료·카페 검색", source: "deterministic" };
  }
  if (TASK_CUE.test(text)) {
    return { category: "task", reasoning: "결정론: 작업 지시어", source: "deterministic" };
  }
  if (isInstantPoiSearch(text)) {
    return {
      category: "search",
      reasoning: "결정론: 즉시 POI(편의·약국 등)",
      source: "deterministic",
    };
  }
  return { category: "search", reasoning: "결정론: 기본 검색", source: "deterministic" };
}

export async function classifyInput(input: {
  text: string;
  region?: string | null;
  history?: readonly string[];
  hasActiveResults?: boolean;
}): Promise<InputClassification> {
  const text = input.text.trim();
  if (!text) {
    return { category: "chat", reasoning: null, source: "deterministic" };
  }
  if (isInstantPoiSearch(text)) {
    return {
      category: "search",
      reasoning: "결정론: 즉시 POI(편의·약국 등)",
      source: "deterministic",
    };
  }
  if (BEVERAGE_SEARCH.test(text)) {
    return { category: "search", reasoning: "결정론: 음료·카페 검색", source: "deterministic" };
  }
  if (WEATHER_CHAT.test(text)) {
    return { category: "chat", reasoning: "결정론: 날씨·기온 질문", source: "deterministic" };
  }
  if (resolveSmallTalk({ text, region: input.region })) {
    return { category: "chat", reasoning: "결정론: 스몰토크 패턴", source: "deterministic" };
  }
  try {
    const response = await fetch("/api/globe/intent-dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        region: input.region ?? null,
        history: input.history ?? [],
        hasActiveResults: input.hasActiveResults ?? false,
      }),
    });
    if (response.ok) {
      const payload = (await response.json()) as Record<string, unknown>;
      const category = payload.category;
      if (category === "chat" || category === "search" || category === "task") {
        return {
          category,
          reasoning: typeof payload.reasoning === "string" ? payload.reasoning : null,
          source: "llm",
        };
      }
    }
  } catch {
    /* fall through to deterministic */
  }
  return deterministicClassify(text, input.region);
}
