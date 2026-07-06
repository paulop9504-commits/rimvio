import type {
  ClarificationQuestion,
  ExecutionPlan,
  ExecutionPlanStep,
  ExtractedMessyIntent,
  MessyPromptIR,
} from "@/lib/messy-prompt-interpreter/types";

function travelPlanningSteps(ir: MessyPromptIR): ExecutionPlanStep[] {
  const steps: ExecutionPlanStep[] = [
    {
      id: "gather-state",
      order: 1,
      labelKo: "지금 상황 읽기",
      kind: "gather",
      detailKo: "위치·시간·짐·피로도를 맥락에 반영",
    },
  ];
  if (ir.state.luggage === true) {
    steps.push({
      id: "baggage",
      order: 2,
      labelKo: "짐 보관/이동 부담 줄이기",
      kind: "act",
      detailKo: "캐리어를 덜 들고 움직이는 옵션 우선",
    });
  }
  steps.push(
    {
      id: "indoor-block",
      order: 3,
      labelKo: "실내·근거리 활동 블록 배치",
      kind: "decide",
      detailKo: "날씨·대기 시간에 맞춘 저리스크 구간",
    },
    {
      id: "meal",
      order: 4,
      labelKo: "식사 슬롯 끼워 넣기",
      kind: "act",
    },
    {
      id: "transfer",
      order: 5,
      labelKo: "숙소/다음 이동 연결",
      kind: "act",
      detailKo: ir.constraints.find((c) => c.includes("체크인")) ?? undefined,
    },
    {
      id: "verify",
      order: 6,
      labelKo: "리스크·시간 다시 점검",
      kind: "verify",
    },
  );
  return steps;
}

function codingSteps(): ExecutionPlanStep[] {
  return [
    {
      id: "repro",
      order: 1,
      labelKo: "재현 조건 정리",
      kind: "gather",
      detailKo: "어디서·언제·어떤 입력에서 깨지는지",
    },
    {
      id: "isolate",
      order: 2,
      labelKo: "원인 범위 좁히기",
      kind: "decide",
    },
    {
      id: "patch",
      order: 3,
      labelKo: "최소 수정안 적용",
      kind: "act",
    },
    {
      id: "verify",
      order: 4,
      labelKo: "회귀 없는지 확인",
      kind: "verify",
    },
  ];
}

function defaultSteps(ir: MessyPromptIR): ExecutionPlanStep[] {
  return [
    {
      id: "understand",
      order: 1,
      labelKo: "의도 구조화",
      kind: "gather",
      detailKo: ir.summaryKo,
    },
    {
      id: "decide",
      order: 2,
      labelKo: "우선 행동 고르기",
      kind: "decide",
    },
    {
      id: "act",
      order: 3,
      labelKo: "실행",
      kind: "act",
    },
    {
      id: "render",
      order: 4,
      labelKo: "결과 보여주기",
      kind: "render",
    },
  ];
}

export function buildExecutionPlan(
  intent: ExtractedMessyIntent,
  ir: MessyPromptIR,
): ExecutionPlan {
  let steps: ExecutionPlanStep[];
  switch (ir.domain) {
    case "travel_planning":
      steps = travelPlanningSteps(ir);
      break;
    case "coding_task":
      steps = codingSteps();
      break;
    default:
      steps = defaultSteps(ir);
  }

  return {
    titleKo: `이렇게 이해했어 — ${intent.taskLabelKo}`,
    understandingKo: ir.professionalRewriteKo,
    steps: steps.sort((a, b) => a.order - b.order),
  };
}

const CONFIDENCE_ASK_THRESHOLD = 0.62;

/** Ask only when necessary; most gaps are filled by assumptions. */
export function buildClarifications(
  intent: ExtractedMessyIntent,
): ClarificationQuestion[] {
  if (intent.confidence >= CONFIDENCE_ASK_THRESHOLD) {
    return [];
  }

  const questions: ClarificationQuestion[] = [];

  if (intent.ambiguities.some((a) => a.includes("이거"))) {
    questions.push({
      id: "target",
      promptKo: "어떤 맥락/대상을 말하는지 한 줄만 더 알려줄 수 있어?",
      optional: true,
    });
  }

  if (
    intent.domain === "eatery" &&
    !intent.stateHints.time_window &&
    intent.urgency !== "high"
  ) {
    questions.push({
      id: "meal-time",
      promptKo: "몇 시쯤 식사할 계획이야?",
      optional: true,
    });
  }

  if (intent.domain === "general" && intent.objective === "unknown") {
    questions.push({
      id: "goal",
      promptKo: "가장 먼저 끝내고 싶은 게 뭐야?",
      optional: false,
    });
  }

  return questions.slice(0, 2);
}
