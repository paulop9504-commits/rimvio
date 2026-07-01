import type { MarketTradeProgressStep } from "@/lib/globe/market/market-trade-types";
import type { AgentTask } from "@/lib/ui/agent-progress-types";

export function tradeProgressStepsToAgentTasks(
  steps: readonly MarketTradeProgressStep[],
): AgentTask[] {
  return steps.map((step) => ({
    id: step.id,
    label: step.labelKo,
    status:
      step.state === "done"
        ? "done"
        : step.state === "active"
          ? "in_progress"
          : "pending",
  }));
}
