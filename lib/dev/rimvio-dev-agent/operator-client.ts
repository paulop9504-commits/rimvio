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
  source: "llm" | "fallback" | "spine";
  contextEventId?: string;
  strategy?: string;
  workLogKo?: string;
  executionId?: string;
  sandboxSessionId?: string | null;
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
  "workspace",
  "graph",
  "api",
  "계속",
  "진행",
];

export function shouldPlanWithOperator(utterance: string): boolean {
  const lower = utterance.toLowerCase();
  if (utterance.trim().length >= 20) return true;
  return COMPLEX_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export function fallbackDevAgentPlan(utterance: string): DevAgentPlan {
  const lower = utterance.toLowerCase();
  const capabilityId = lower.includes("detail") || lower.includes("상세")
    ? "hotel.detail"
    : lower.includes("product") || lower.includes("macbook")
      ? "product.search"
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
        : capabilityId === "product.search"
          ? { query: "MacBook", limit: 5 }
          : { location: "오사카, 일본", checkIn: "2024-06-01", checkOut: "2024-06-03" },
  };
}

function mapSpineSteps(
  steps: readonly { stage: string; label: string; done: boolean }[],
): DevAgentPlan["steps"] {
  const stageMap: Record<string, DevAgentWorkflowStage> = {
    observe: "understand",
    judge: "plan",
    plan: "plan",
    execute: "run",
    verify: "verify",
  };
  return steps.map((step) => ({
    stage: stageMap[step.stage] ?? "plan",
    label: step.done ? `✓ ${step.label}` : step.label,
  }));
}

export async function planDevAgentTurn(
  utterance: string,
  platformId = "dev",
): Promise<DevAgentPlan> {
  try {
    const res = await fetch("/api/agent-platform/operator/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        utterance,
        platformId,
        autoExecute: false,
      }),
    });

    if (res.ok) {
      const turn = (await res.json()) as {
        goalKo?: string;
        capabilityId?: string;
        steps?: Array<{ stage: string; label: string; done: boolean }>;
        contextEventId?: string;
        strategy?: string;
        workLogKo?: string;
      };

      return {
        goalKo: turn.goalKo ?? utterance.slice(0, 120),
        capabilityId: turn.capabilityId ?? "hotel.search",
        source: "spine",
        contextEventId: turn.contextEventId,
        strategy: turn.strategy,
        workLogKo: turn.workLogKo,
        steps: turn.steps?.length
          ? mapSpineSteps(turn.steps)
          : fallbackDevAgentPlan(utterance).steps,
        sandboxInput: buildSandboxInputForCapability(
          turn.capabilityId ?? "hotel.search",
          utterance,
        ),
      };
    }
  } catch {
    /* fall through */
  }

  return fallbackDevAgentPlan(utterance);
}

export async function runDevAgentOperatorTurn(
  utterance: string,
  platformId = "dev",
): Promise<DevAgentPlan> {
  try {
    const res = await fetch("/api/agent-platform/operator/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        utterance,
        platformId,
        autoExecute: true,
      }),
    });

    if (res.ok) {
      const turn = (await res.json()) as {
        goalKo?: string;
        capabilityId?: string;
        steps?: Array<{ stage: string; label: string; done: boolean }>;
        contextEventId?: string;
        strategy?: string;
        workLogKo?: string;
        invoke?: {
          executionId?: string;
          sandboxSessionId?: string | null;
          ok?: boolean;
        };
      };

      return {
        goalKo: turn.goalKo ?? utterance.slice(0, 120),
        capabilityId: turn.capabilityId ?? "hotel.search",
        source: "spine",
        contextEventId: turn.contextEventId,
        strategy: turn.strategy,
        workLogKo: turn.workLogKo,
        executionId: turn.invoke?.executionId,
        sandboxSessionId: turn.invoke?.sandboxSessionId,
        steps: turn.steps?.length
          ? mapSpineSteps(turn.steps)
          : fallbackDevAgentPlan(utterance).steps,
        sandboxInput: buildSandboxInputForCapability(
          turn.capabilityId ?? "hotel.search",
          utterance,
        ),
      };
    }
  } catch {
    /* fall through */
  }

  return fallbackDevAgentPlan(utterance);
}

function buildSandboxInputForCapability(
  capabilityId: string,
  utterance: string,
): Record<string, unknown> {
  if (capabilityId === "product.search") {
    return { query: utterance.toLowerCase().includes("macbook") ? "MacBook" : "laptop", limit: 5 };
  }
  if (capabilityId === "hotel.detail") {
    return { hotelId: "grand-osaka" };
  }
  if (capabilityId.startsWith("workspace.")) {
    return { utterance };
  }
  return {
    location: "오사카, 일본",
    checkIn: "2024-06-01",
    checkOut: "2024-06-03",
    guests: "2",
  };
}
