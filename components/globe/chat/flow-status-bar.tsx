"use client";

import type { FlowStep } from "@/lib/portal/compose-draft/flow-step-types";
import { flowStepsToAgentTasks } from "@/lib/portal/compose-draft/flow-steps-to-agent-tasks";
import type { SellItemDraft } from "@/lib/portal/compose-draft/types";
import { AgentProgressList } from "@/components/ui/agent-progress-list";
import { cn } from "@/lib/utils";

export type FlowStatusBarProps = {
  draft: Partial<SellItemDraft>;
  flow: readonly FlowStep[];
  className?: string;
  highlightComplete?: boolean;
};

/** Compose flow rail — vertical agent progress (chat header). */
export function FlowStatusBar({
  draft,
  flow,
  className,
  highlightComplete = false,
}: FlowStatusBarProps) {
  const tasks = flowStepsToAgentTasks(flow, draft);
  const allDone = tasks.every((task) => task.status === "done");

  return (
    <div
      className={cn(
        "border-b border-white/8 px-3 py-2.5",
        highlightComplete && allDone && "bg-[#34c759]/12",
        className,
      )}
      data-globe-flow-status-bar
    >
      <AgentProgressList tasks={tasks} variant="dark" layout="vertical" />
    </div>
  );
}
