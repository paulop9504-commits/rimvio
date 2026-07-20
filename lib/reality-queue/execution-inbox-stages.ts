/**
 * Execution Inbox pipeline — Project → explore domains → 결재함 → CEO Sign → Commit.
 * L2 product names; L1 copy lives in human-ko / progress-copy.
 */

export const EXECUTION_INBOX_PIPELINE = [
  "CREATE_PROJECT",
  "SCOUT_FLIGHT",
  "SCOUT_HOTEL",
  "SCOUT_EATERY",
  "SCOUT_RENTAL",
  "COMPARE_PRICE",
  "CHECK_AVAILABILITY",
  "PREP_COMPLETE",
  "EXECUTION_INBOX",
  "CEO_SIGN",
  "EXECUTE",
  "REALITY_COMMIT",
] as const;

export type ExecutionInboxPipelineStep =
  (typeof EXECUTION_INBOX_PIPELINE)[number];

export const EXECUTION_INBOX_PIPELINE_PROGRESS_KO: Readonly<
  Record<ExecutionInboxPipelineStep, string>
> = {
  CREATE_PROJECT: "프로젝트를 만드는 중…",
  SCOUT_FLIGHT: "항공편을 탐색하는 중…",
  SCOUT_HOTEL: "호텔을 탐색하는 중…",
  SCOUT_EATERY: "맛집을 탐색하는 중…",
  SCOUT_RENTAL: "렌터카를 탐색하는 중…",
  COMPARE_PRICE: "가격을 비교하는 중…",
  CHECK_AVAILABILITY: "예약 가능 시간을 확인하는 중…",
  PREP_COMPLETE: "모든 예약 준비가 끝났어요",
  EXECUTION_INBOX: "결재함으로 옮기는 중…",
  CEO_SIGN: "CEO Sign 대기…",
  EXECUTE: "Execute 중…",
  REALITY_COMMIT: "Reality Commit…",
};

export const EXECUTION_INBOX_PIPELINE_DONE_KO: Readonly<
  Record<ExecutionInboxPipelineStep, string>
> = {
  CREATE_PROJECT: "프로젝트를 만들었습니다.",
  SCOUT_FLIGHT: "항공 후보를 모았습니다.",
  SCOUT_HOTEL: "호텔 후보를 모았습니다.",
  SCOUT_EATERY: "맛집 후보를 모았습니다.",
  SCOUT_RENTAL: "렌터카 후보를 모았습니다.",
  COMPARE_PRICE: "가격 비교를 마쳤습니다.",
  CHECK_AVAILABILITY: "예약 가능 시간을 확인했습니다.",
  PREP_COMPLETE: "모든 예약 준비가 완료됐습니다.",
  EXECUTION_INBOX: "결재함에 올렸습니다.",
  CEO_SIGN: "CEO Sign이 완료됐습니다.",
  EXECUTE: "Execute를 시작했습니다.",
  REALITY_COMMIT: "Reality에 반영했습니다.",
};
