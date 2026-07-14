import type {
  AgentStage,
  ExecutionLaneId,
  IntentExecutionProfile,
} from "@/lib/intent-engine/agent-stage";

/** L1 stage progress — keep in sync with copy.globe.intentExecution.stages */
export const AGENT_STAGE_PROGRESS_KO: Readonly<Record<AgentStage, string>> = {
  IDLE: "대기 중",
  UNDERSTAND_INTENT: "사용자의 요청을 이해하는 중...",
  FIND_CONTEXT: "현재 여행 맥락을 찾는 중...",
  LOAD_MEMORY: "이전 작업·예약을 불러오는 중...",
  SEARCH: "관련 일정을 찾는 중...",
  ANALYZE: "예약 정보를 분석하는 중...",
  PLAN: "새 실행 계획을 생성하는 중...",
  PREPARE_TOOLS: "필요한 도구를 준비하는 중...",
  EXECUTE: "예약 가능 여부를 확인하는 중...",
  VERIFY: "변경 영향을 계산하는 중...",
  BUILD_DIFF: "변경 사항을 정리하는 중...",
  WAIT_APPROVAL: "사용자 승인을 기다리는 중...",
  COMMIT: "현실을 반영하는 중...",
  COMPLETE: "완료",
};

export const EXECUTION_LANE_TITLE_KO: Readonly<Record<ExecutionLaneId, string>> = {
  intent: "Intent",
  context: "Context",
  analysis: "Analysis",
  planner: "Planner",
  agent: "Agent",
  reality_diff: "Reality Diff",
};

/** Done-summary when a lane has finished (past tense, calm). */
export const EXECUTION_LANE_DONE_KO: Readonly<
  Record<ExecutionLaneId, Record<IntentExecutionProfile, string>>
> = {
  intent: {
    trip_revise: "요청 의도를 이해했습니다.",
    generic: "요청 의도를 이해했습니다.",
  },
  context: {
    trip_revise: "현재 여행 맥락을 찾았습니다.",
    generic: "관련 맥락을 찾았습니다.",
  },
  analysis: {
    trip_revise: "기존 예약과 일정을 분석했습니다.",
    generic: "관련 정보를 분석했습니다.",
  },
  planner: {
    trip_revise: "새 실행 계획을 만들었습니다.",
    generic: "실행 계획을 만들었습니다.",
  },
  agent: {
    trip_revise: "예약·도구 확인을 마쳤습니다.",
    generic: "실행 준비를 마쳤습니다.",
  },
  reality_diff: {
    trip_revise: "변경 사항을 정리했습니다.",
    generic: "변경 사항을 정리했습니다.",
  },
};

export function stageProgressKo(stage: AgentStage): string {
  return AGENT_STAGE_PROGRESS_KO[stage];
}
