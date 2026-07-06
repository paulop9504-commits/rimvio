import type {
  InterpreterExecutionContext,
  InterpreterExecutionResult,
  InterpreterExecutor,
  MessyPromptIR,
} from "@/lib/messy-prompt-interpreter/types";

/** Default executor — surfaces structured understanding (safe no-op for any IR). */
export const defaultInterpreterExecutor: InterpreterExecutor = {
  id: "rimvio.default_surface",
  canExecute: () => true,
  async execute(ctx: InterpreterExecutionContext): Promise<InterpreterExecutionResult> {
    const stepLines = ctx.plan.steps
      .map((step) => `${step.order}. ${step.labelKo}`)
      .join("\n");
    return {
      executorId: "rimvio.default_surface",
      status: "done",
      outputKo: [
        ctx.ir.summaryKo,
        "",
        "다음 단계:",
        stepLines,
      ].join("\n"),
      payload: {
        domain: ctx.ir.domain,
        objective: ctx.ir.objective,
        ir: ctx.ir,
      },
    };
  },
};

export const travelPlanningExecutor: InterpreterExecutor = {
  id: "rimvio.travel_planning",
  canExecute: (ir: MessyPromptIR) => ir.domain === "travel_planning",
  async execute(ctx: InterpreterExecutionContext): Promise<InterpreterExecutionResult> {
    const riskNote = ctx.ir.constraints.includes("리스크 최소화")
      ? "이동·대기 리스크를 줄이는 순서로 배치했어."
      : "시간 창에 맞춰 단계를 정리했어.";
    return {
      executorId: "rimvio.travel_planning",
      status: "done",
      outputKo: `${ctx.ir.summaryKo}\n${riskNote}`,
      payload: {
        optimizationGoals: ctx.ir.optimizationGoals,
        state: ctx.ir.state,
      },
    };
  },
};

export const codingTaskExecutor: InterpreterExecutor = {
  id: "rimvio.coding_task",
  canExecute: (ir: MessyPromptIR) => ir.domain === "coding_task",
  async execute(ctx: InterpreterExecutionContext): Promise<InterpreterExecutionResult> {
    return {
      executorId: "rimvio.coding_task",
      status: "done",
      outputKo: `버그 작업으로 구조화: ${ctx.intent.taskLabelKo}\n${ctx.ir.professionalRewriteKo}`,
      payload: {
        reproHints: ctx.ir.entities,
        objective: ctx.ir.objective,
      },
    };
  },
};

export const DEFAULT_INTERPRETER_EXECUTORS: InterpreterExecutor[] = [
  travelPlanningExecutor,
  codingTaskExecutor,
  defaultInterpreterExecutor,
];

export async function runInterpreterExecutors(
  ctx: InterpreterExecutionContext,
  executors: InterpreterExecutor[],
): Promise<InterpreterExecutionResult> {
  const chain = executors.length > 0 ? executors : DEFAULT_INTERPRETER_EXECUTORS;
  const match = chain.find((executor) => executor.canExecute(ctx.ir));
  if (!match) {
    return {
      executorId: "none",
      status: "skipped",
      outputKo: "실행 가능한 핸들러가 없어요.",
    };
  }
  return match.execute(ctx);
}
