"use client";

import { activityEventsFromLog, type AgentEventLog } from "@/lib/agent/events";
import { cn } from "@/lib/utils";

export type AgentActivityPanelProps = {
  readonly log: AgentEventLog;
  readonly emptyLabel?: string;
  readonly className?: string;
};

export function AgentActivityPanel({
  log,
  emptyLabel = "Activity — Agent 이벤트 대기 중",
  className,
}: AgentActivityPanelProps) {
  const events = activityEventsFromLog(log);
  if (events.length === 0) {
    return <p className={cn("p-4 text-center text-[10px] text-[#9ca3af]", className)}>{emptyLabel}</p>;
  }
  return (
    <ul className={cn("space-y-1.5 p-2.5", className)}>
      {events.map((a) => (
        <li key={a.id} className="flex items-start gap-1.5 text-[9px] text-[#4b5563]">
          <span
            className={cn(
              "mt-1 size-1.5 shrink-0 rounded-full",
              a.kind === "completed" || a.kind === "verification"
                ? "bg-emerald-500"
                : a.kind === "error" || a.kind === "approval_required"
                  ? "bg-amber-500"
                  : "bg-violet-400",
            )}
          />
          <span>
            <span className="font-medium text-[#374151]">{a.label}</span>
            {a.detail ? <span className="text-[#9ca3af]"> · {a.detail.slice(0, 60)}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
