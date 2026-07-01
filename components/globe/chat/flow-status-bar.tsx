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
  tone?: "dark" | "light";
};

/** Compose flow rail — vertical agent progress (chat header). */
export function FlowStatusBar({
  draft,
  flow,
  className,
  highlightComplete = false,
  tone = "dark",
}: FlowStatusBarProps) {
  const tasks = flowStepsToAgentTasks(flow, draft);
  const allDone = tasks.every((task) => task.status === "done");
  const light = tone === "light";

  return (
    <div
      className={cn(
        "px-3 py-2.5",
        light ? "border-b border-black/[0.06] bg-white/60" : "border-b border-white/8",
        highlightComplete && allDone && (light ? "bg-[#e8f5ec]/80" : "bg-[#34c759]/12"),
        className,
      )}
      data-globe-flow-status-bar
    >
      <AgentProgressList
        tasks={tasks}
        variant={light ? "light" : "dark"}
        layout="vertical"
      />
    </div>
  );
}
