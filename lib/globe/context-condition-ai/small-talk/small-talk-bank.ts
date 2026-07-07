import type { SmallTalkTopic } from "@/lib/globe/context-condition-ai/resolve-small-talk";

/**
 * Small-talk bank (Stage 3) — patterns are stored as *structured strategy*, not
 * fixed answers. Each topic declares which context variables it wants and how it
 * should respond. The deterministic composer and the LLM prompt both read this,
 * so behaviour stays consistent whether or not a model is available.
 */

export type SmallTalkContextRequirement =
  | "time"
  | "status"
  | "history"
  | "tone"
  | "persona";

export type SmallTalkBankEntry = {
  readonly patterns: readonly string[];
  readonly contextRequirements: readonly SmallTalkContextRequirement[];
  readonly responseStrategy: string;
};

export const SMALL_TALK_BANK: Record<SmallTalkTopic, SmallTalkBankEntry> = {
  greeting: {
    patterns: ["안녕", "ㅎㅇ", "하이", "잘 있었어?", "좋은 아침"],
    contextRequirements: ["time", "status", "history", "persona"],
    responseStrategy:
      "시간대에 맞는 인사로 먼저 상황을 던지고, 최근 검색/대화가 있으면 가볍게 언급한 뒤 열린 질문으로 대화를 이어라.",
  },
  thanks: {
    patterns: ["고마워", "감사", "ㄳ", "thanks"],
    contextRequirements: ["tone", "persona"],
    responseStrategy: "짧게 화답하고, 더 도울 게 있는지 열린 질문으로 마무리하라.",
  },
  farewell: {
    patterns: ["잘가", "바이", "수고", "잘자"],
    contextRequirements: ["time"],
    responseStrategy: "시간대에 맞춰 따뜻하게 배웅하고, 다음을 기약하는 한마디로 닫아라.",
  },
  capability: {
    patterns: ["뭐 할 수 있어?", "누구야", "기능"],
    contextRequirements: ["status"],
    responseStrategy: "할 수 있는 걸 예시 한둘로 짧게 보여주고, 무엇을 찾아줄지 물어라.",
  },
  weather: {
    patterns: ["날씨 덥다", "비 온다", "미세먼지", "춥네"],
    contextRequirements: ["time", "status", "history"],
    responseStrategy:
      "날씨/계절 상황을 먼저 공감으로 던지고, 실내·카페 등 가벼운 제안을 곁들인 뒤 오늘 계획을 열린 질문으로 물어라.",
  },
  time_state: {
    patterns: ["피곤해", "졸려", "주말이다", "월요일", "벌써 시간이"],
    contextRequirements: ["time", "history", "persona"],
    responseStrategy:
      "무조건 먼저 공감하고, 시간대/요일에 맞는 가벼운 해결책(휴식·산책·음악)을 제안한 뒤 상태를 묻는 질문으로 이어라.",
  },
  food: {
    patterns: ["뭐 먹지", "배고파", "커피 당겨", "점심 뭐"],
    contextRequirements: ["time", "status", "history"],
    responseStrategy:
      "식욕/끼니 상황에 공감하고, 근처 맛집·카페 검색을 자연스럽게 제안한 뒤 뭐가 당기는지 열린 질문으로 물어라.",
  },
  mood_up: {
    patterns: ["대박이야", "일찍 끝났다", "기분 좋아", "합격"],
    contextRequirements: ["tone", "persona", "history"],
    responseStrategy: "함께 기뻐하는 리액션을 크게 하고, 무슨 좋은 일인지 열린 질문으로 더 들어라.",
  },
  mood_down: {
    patterns: ["힘들었어", "속상해", "짜증나", "실수했어"],
    contextRequirements: ["tone", "persona", "time"],
    responseStrategy:
      "검색 대신 먼저 진심으로 공감하고, 무슨 일이 있었는지 부드러운 열린 질문으로 이야기를 들어줘라.",
  },
  catch_up: {
    patterns: ["별일 없지?", "요즘 어때", "그 드라마 봤어?", "심심해"],
    contextRequirements: ["history", "persona", "time"],
    responseStrategy:
      "최근 대화/검색을 기억한 듯 메타 인지를 섞어 안부를 묻고, 근황을 여는 열린 질문으로 대화를 확장하라.",
  },
  ack: {
    patterns: ["ㅇㅋ", "오케이", "좋아", "응"],
    contextRequirements: ["tone"],
    responseStrategy: "가볍게 받아치고, 바로 무엇을 도와줄지 짧은 질문으로 넘겨라.",
  },
  filler: {
    patterns: ["ㅋㅋ", "ㅎㅎ", "헐", "음..."],
    contextRequirements: ["tone"],
    responseStrategy: "리듬을 맞춰 짧게 받고, 편하게 말 걸도록 열린 질문 한마디를 붙여라.",
  },
};

export function readSmallTalkStrategy(topic: SmallTalkTopic): SmallTalkBankEntry {
  return SMALL_TALK_BANK[topic];
}
