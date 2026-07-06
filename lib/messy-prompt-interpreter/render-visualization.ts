import type {
  ExecutionPlan,
  InterpreterVisualization,
  MessyPromptIR,
} from "@/lib/messy-prompt-interpreter/types";

const TIME_LABELS = ["지금", "다음", "그다음", "마지막", "이후"];

/** Stage 4 — IR + plan → timeline / graph / cards for UI renderers. */
export function renderInterpreterVisualization(
  ir: MessyPromptIR,
  plan: ExecutionPlan,
): InterpreterVisualization {
  const timeline = plan.steps.map((step, index) => ({
    timeLabel: TIME_LABELS[index] ?? `Step ${index + 1}`,
    titleKo: step.labelKo,
    detailKo: step.detailKo,
  }));

  const nodes = plan.steps.map((step, index) => ({
    id: step.id,
    labelKo: step.labelKo,
    kind:
      index === 0
        ? ("start" as const)
        : index === plan.steps.length - 1
          ? ("end" as const)
          : step.kind === "decide"
            ? ("decision" as const)
            : ("action" as const),
  }));

  const edges = plan.steps.slice(1).map((step, index) => ({
    from: plan.steps[index]!.id,
    to: step.id,
  }));

  const cards: InterpreterVisualization["cards"] = [
    {
      titleKo: "요약",
      bodyKo: ir.summaryKo,
      emphasis: "primary",
    },
    {
      titleKo: "구조화된 의도",
      bodyKo: ir.professionalRewriteKo,
    },
  ];

  if (ir.constraints.length > 0) {
    cards.push({
      titleKo: "제약",
      bodyKo: ir.constraints.map((c) => `· ${c}`).join("\n"),
      emphasis: "muted",
    });
  }

  if (ir.assumptions.length > 0) {
    cards.push({
      titleKo: "가정",
      bodyKo: ir.assumptions.map((a) => `· ${a}`).join("\n"),
      emphasis: "muted",
    });
  }

  return { timeline, graph: { nodes, edges }, cards };
}
