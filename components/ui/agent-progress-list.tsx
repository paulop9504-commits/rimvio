"use client";

import { Check, Loader2 } from "lucide-react";
import type {
  AgentProgressLayout,
  AgentProgressVariant,
  AgentTask,
} from "@/lib/ui/agent-progress-types";
import { cn } from "@/lib/utils";

export type AgentProgressListProps = {
  tasks: readonly AgentTask[];
  titleKo?: string | null;
  layout?: AgentProgressLayout;
  variant?: AgentProgressVariant;
  className?: string;
};

function StatusGlyph({
  status,
  variant,
}: {
  status: AgentTask["status"];
  variant: AgentProgressVariant;
}) {
  const dark = variant === "dark";

  if (status === "done") {
    return (
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
          dark ? "bg-[#34c759]/20 text-[#5de37a]" : "bg-[#dcfce7] text-[#16a34a]",
        )}
        aria-hidden
      >
        <Check className="size-2.5" strokeWidth={3} />
      </span>
    );
  }

  if (status === "in_progress") {
    return (
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center",
          dark ? "text-[#5ac8fa]" : "text-[#3182f6]",
        )}
        aria-hidden
      >
        <Loader2 className="size-3.5 animate-spin" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center text-[11px] font-medium",
        dark ? "text-white/35" : "text-[#c4cdd5]",
      )}
      aria-hidden
    >
      ○
    </span>
  );
}

function TaskRow({
  task,
  variant,
  showArrow,
}: {
  task: AgentTask;
  variant: AgentProgressVariant;
  showArrow: boolean;
}) {
  const dark = variant === "dark";

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2",
        task.status === "in_progress" && "animate-pulse",
      )}
      data-agent-task={task.id}
      data-agent-task-status={task.status}
    >
      <StatusGlyph status={task.status} variant={variant} />
      <span
        className={cn(
          "min-w-0 truncate text-[11px] leading-snug",
          task.status === "done" && (dark ? "text-white/72" : "text-[#8b95a1]"),
          task.status === "in_progress" &&
            (dark ? "font-medium text-[#5ac8fa]" : "font-medium text-[#3182f6]"),
          task.status === "pending" && (dark ? "text-white/40" : "text-[#b0b8c1]"),
        )}
      >
        {showArrow && task.status === "in_progress" ? (
          <span className="mr-0.5" aria-hidden>
            →
          </span>
        ) : null}
        {task.label}
      </span>
    </div>
  );
}

/** Reusable agent / FSM progress — ✓ done · spinner in_progress · ○ pending. */
export function AgentProgressList({
  tasks,
  titleKo,
  layout = "vertical",
  variant = "dark",
  className,
}: AgentProgressListProps) {
  if (tasks.length === 0) {
    return null;
  }

  const dark = variant === "dark";

  if (layout === "horizontal") {
    return (
      <div
        className={cn("flex flex-col gap-1.5", className)}
        data-agent-progress-list
        data-agent-progress-layout="horizontal"
      >
        {titleKo ? (
          <p
            className={cn(
              "text-[11px] font-semibold",
              dark ? "text-white/85" : "text-[#191f28]",
            )}
          >
            {titleKo}
          </p>
        ) : null}
        <div className="flex items-start justify-between gap-1">
          {tasks.map((task, index) => (
            <div key={task.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <StatusGlyph status={task.status} variant={variant} />
              <span
                className={cn(
                  "w-full truncate text-center text-[10px] font-medium leading-tight",
                  task.status === "done" && (dark ? "text-white/70" : "text-[#8b95a1]"),
                  task.status === "in_progress" &&
                    (dark ? "text-[#5ac8fa]" : "text-[#22c55e]"),
                  task.status === "pending" && (dark ? "text-white/38" : "text-[#b0b8c1]"),
                )}
              >
                {task.label}
              </span>
              {index < tasks.length - 1 ? (
                <span
                  className={cn(
                    "absolute hidden",
                    dark ? "text-white/20" : "text-[#e5e8eb]",
                  )}
                  aria-hidden
                />
              ) : null}
            </div>
          ))}
        </div>
        <div
          className={cn(
            "relative h-0.5 rounded-full",
            dark ? "bg-white/10" : "bg-[#e5e8eb]",
          )}
        >
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
              dark ? "bg-[#5ac8fa]/70" : "bg-[#22c55e]",
            )}
            style={{
              width: `${Math.max(
                12,
                ((tasks.filter((task) => task.status === "done").length +
                  (tasks.some((task) => task.status === "in_progress") ? 0.5 : 0)) /
                  tasks.length) *
                  100,
              )}%`,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-col gap-1.5", className)}
      data-agent-progress-list
      data-agent-progress-layout="vertical"
    >
      {titleKo ? (
        <p
          className={cn(
            "text-[11px] font-semibold",
            dark ? "text-white/88" : "text-[#191f28]",
          )}
        >
          {titleKo}
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} variant={variant} showArrow />
        ))}
      </div>
    </div>
  );
}
