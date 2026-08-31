export type DevAgentWorkflowStage =
  | "understand"
  | "plan"
  | "build"
  | "run"
  | "verify"
  | "publish";

export type DevAgentPlan = {
  goalKo: string;
  capabilityId: string;
  steps: Array<{ stage: DevAgentWorkflowStage; label: string }>;
  sandboxInput?: Record<string, unknown>;
  source: "llm" | "fallback";
};

const COMPLEX_KEYWORDS = [
  "가격",
  "추출",
  "추가",
  "update",
  "개선",
  "수정",
  "만들",
  "build",
  "detail",
  "상세",
];

export function shouldPlanWithOperator(utterance: string): boolean {
  const lower = utterance.toLowerCase();
  if (utterance.trim().length >= 28) return true;
  return COMPLEX_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export function fallbackDevAgentPlan(utterance: string): DevAgentPlan {
  const lower = utterance.toLowerCase();
  const capabilityId = lower.includes("detail") || lower.includes("상세")
    ? "hotel.detail"
    : "hotel.search";

  return {
    goalKo: utterance.slice(0, 120),
    capabilityId,
    source: "fallback",
    steps: [
      { stage: "understand", label: "Understand request" },
      { stage: "plan", label: `Plan ${capabilityId}` },
      { stage: "build", label: "Prepare sandbox input" },
      { stage: "run", label: "Run sandbox test" },
      { stage: "verify", label: "Verify output schema" },
    ],
    sandboxInput:
      capabilityId === "hotel.detail"
        ? { hotelId: "grand-osaka" }
        : { location: "오사카, 일본", checkIn: "2024-06-01", checkOut: "2024-06-03" },
  };
}

export async function planDevAgentTurn(utterance: string): Promise<DevAgentPlan> {
  try {
    const res = await fetch("/api/hub/dev/operator/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        utterance,
        inspect: {
          platformName: "OsakaStay",
          capabilities: ["hotel.search", "hotel.detail"],
        },
        repoReady: false,
      }),
    });

    if (!res.ok) {
      return fallbackDevAgentPlan(utterance);
    }

    const plan = (await res.json()) as {
      goalKo?: string;
      steps?: Array<{ label?: string; toolId?: string }>;
    };

    const capabilityId =
      utterance.toLowerCase().includes("detail") || utterance.includes("상세")
        ? "hotel.detail"
        : "hotel.search";

    const steps =
      plan.steps?.length && plan.steps.length > 0
        ? plan.steps.map((step, index) => ({
            stage: (["understand", "plan", "build", "run", "verify"] as const)[
              Math.min(index, 4)
            ]!,
            label: step.label ?? step.toolId ?? `Step ${index + 1}`,
          }))
        : fallbackDevAgentPlan(utterance).steps;

    return {
      goalKo: plan.goalKo ?? utterance.slice(0, 120),
      capabilityId,
      steps,
      source: "llm",
      sandboxInput:
        capabilityId === "hotel.detail"
          ? { hotelId: "grand-osaka" }
          : { location: "오사카, 일본", checkIn: "2024-06-01", checkOut: "2024-06-03" },
    };
  } catch {
    return fallbackDevAgentPlan(utterance);
  }
}
