import { copy } from "@/lib/copy/human-ko";
import type { FlowStep } from "@/lib/portal/compose-draft/flow-step-types";
import type { SellItemDraft } from "@/lib/portal/compose-draft/types";
import type { AgentTask, AgentTaskStatus } from "@/lib/ui/agent-progress-types";

function activeLabelForStep(step: FlowStep): string {
  const progress = copy.globe.agentProgress;
  switch (step.key) {
    case "basic_info":
      return progress.flowBasicInfoActive;
    case "photo":
      return progress.flowPhotoActive;
    case "description":
      return progress.flowDescriptionActive;
    case "done":
      return progress.flowSubmitActive;
    default:
      return step.labelKo;
  }
}

function resolveStepStatus(
  flow: readonly FlowStep[],
  draft: Partial<SellItemDraft>,
  index: number,
): AgentTaskStatus {
  const step = flow[index]!;
  if (step.isComplete(draft)) {
    return "done";
  }
  const priorDone = flow.slice(0, index).every((item) => item.isComplete(draft));
  if (priorDone) {
    return "in_progress";
  }
  return "pending";
}

export function flowStepsToAgentTasks(
  flow: readonly FlowStep[],
  draft: Partial<SellItemDraft>,
): AgentTask[] {
  return flow.map((step, index) => {
    const status = resolveStepStatus(flow, draft, index);
    const label =
      status === "in_progress" ? activeLabelForStep(step) : step.labelKo;
    return {
      id: step.key,
      label,
      status,
    };
  });
}
