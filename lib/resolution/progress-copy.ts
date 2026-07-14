import type { ResolutionPhase } from "@/lib/resolution/types";

/** L1 progress — one message per Resolution phase. */
export const RESOLUTION_PHASE_PROGRESS_KO: Readonly<Record<ResolutionPhase, string>> = {
  intent: "무슨 일을 원하는지 파악하는 중...",
  semantic: "신혼·인디 같은 의미를 해석하는 중...",
  context: "현재 여행 맥락을 확인하는 중...",
  research: "무엇을 조사해야 하는지 정리하는 중...",
  simulation: "가상으로 실행해 보는 중...",
  decision: "최적안을 고르는 중...",
  reality_planner: "현실 반영 계획을 짜는 중...",
  execution: "실행 준비를 마치는 중...",
};

export const RESOLUTION_PHASE_DONE_KO: Readonly<Record<ResolutionPhase, string>> = {
  intent: "요청한 일을 이해했습니다.",
  semantic: "의미·취향 프로필을 만들었습니다.",
  context: "현재 상황을 연결했습니다.",
  research: "조사할 항목을 정했습니다.",
  simulation: "가상 실행 결과를 준비했습니다.",
  decision: "최적안을 결정했습니다.",
  reality_planner: "현실 계획을 만들었습니다.",
  execution: "승인 후 실행할 준비가 됐습니다.",
};

export const RESOLUTION_PHASE_TITLE_KO: Readonly<Record<ResolutionPhase, string>> = {
  intent: "Intent",
  semantic: "Semantic",
  context: "Context",
  research: "Research",
  simulation: "Simulation",
  decision: "Decision",
  reality_planner: "Reality Planner",
  execution: "Execution",
};

export function resolutionProgressKo(phase: ResolutionPhase): string {
  return RESOLUTION_PHASE_PROGRESS_KO[phase];
}
