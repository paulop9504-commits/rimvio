import { copy } from "@/lib/copy/human-ko";
import type { ResourceStatus } from "@/lib/resource/resource-status-types";
import type { AgentTask } from "@/lib/ui/agent-progress-types";

/** Field / chat — AI matching pipeline steps from ResourceStatus. */
export function buildMatchAgentTasks(status: ResourceStatus): AgentTask[] {
  const labels = copy.globe.agentProgress;
  const matchCount = status.aiActivity.matchedCandidates.length;
  const inquiryCount = status.aiActivity.inquiries.length;

  const radiusStatus: AgentTask["status"] = "done";
  let matchStatus: AgentTask["status"] = "in_progress";
  let scheduleStatus: AgentTask["status"] = "pending";

  if (matchCount > 0) {
    matchStatus = "done";
    scheduleStatus = inquiryCount > 0 ? "in_progress" : "pending";
  }

  return [
    { id: "search", label: labels.matchStepRadius, status: radiusStatus },
    { id: "match", label: labels.matchStepInterest, status: matchStatus },
    { id: "schedule", label: labels.matchStepSchedule, status: scheduleStatus },
  ];
}

export function matchAgentTasksComplete(tasks: readonly AgentTask[]): boolean {
  return tasks.length > 0 && tasks.every((task) => task.status === "done");
}
