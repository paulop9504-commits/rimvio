"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import type { CursorAgentTrailView } from "@/lib/ui/build-cursor-agent-trail-view";
import { cn } from "@/lib/utils";

export type CursorAgentActivityTrailProps = {
  view: CursorAgentTrailView;
  className?: string;
};

/**
 * Cursor Agent Trail — vertical stepper (reference: tool count · clock steps · dot sub-steps · summary).
 */
export function CursorAgentActivityTrail({
  view,
  className,
}: CursorAgentActivityTrailProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!view.running) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 700);
    return () => window.clearInterval(id);
  }, [view.running, view.steps.length]);

  const thoughtSec = Math.max(
    1,
    Math.round((nowMs - view.startedAtMs) / 1000),
  );

  return (
    <div
      className={cn("rounded-2xl bg-[#fafafa] px-3 py-2.5", className)}
      data-cursor-agent-activity-trail
      data-finished={view.finished ? "1" : "0"}
      data-running={view.running ? "1" : "0"}
    >
      {view.toolCount > 0 ? (
        <p className="mb-2 text-[11px] font-medium text-[#8e8e8e]">
          {view.toolsUsedLineKo}
        </p>
      ) : null}

      <ol className="relative ml-0.5 space-y-0 border-l border-[#e5e5e5] pl-4">
        {view.running ? (
          <li className="relative pb-3">
            <span className="absolute -left-[1.34rem] top-0.5 flex size-5 items-center justify-center rounded-full bg-white ring-1 ring-[#e5e5e5]">
              <Clock3 className="size-3 text-[#8e8e8e]" strokeWidth={2} aria-hidden />
            </span>
            <p className="text-[13px] leading-snug text-[#3d3d3d]">
              {view.thoughtLineKo.replace(/\d+초/, `${thoughtSec}초`)}
            </p>
            {view.phaseLineKo ? (
              <p className="mt-1 text-[12px] leading-snug text-[#8e8e8e]">
                {view.phaseLineKo}
              </p>
            ) : null}
          </li>
        ) : null}

        {view.steps.map((step) => (
          <li
            key={step.id}
            className={cn(
              "relative pb-3 last:pb-0",
              step.tier === "sub" && "pb-2 pl-1",
            )}
          >
            {step.tier === "main" ? (
              <span className="absolute -left-[1.34rem] top-0.5 flex size-5 items-center justify-center rounded-full bg-white ring-1 ring-[#e5e5e5]">
                {step.active ? (
                  <span className="size-2 animate-pulse rounded-full bg-[#8ec5f8]" />
                ) : step.done ? (
                  <Clock3 className="size-3 text-[#8e8e8e]" strokeWidth={2} aria-hidden />
                ) : (
                  <span className="size-1.5 rounded-full bg-[#c7c7c7]" />
                )}
              </span>
            ) : (
              <span className="absolute -left-[1.02rem] top-[0.45rem] size-1.5 rounded-full bg-[#c7c7c7]" />
            )}
            <p
              className={cn(
                "leading-snug",
                step.tier === "main"
                  ? "text-[13px] text-[#3d3d3d]"
                  : "text-[12px] text-[#8e8e8e]",
                step.active && "font-medium text-[#1d1d1f]",
              )}
            >
              {step.labelKo}
            </p>
            {step.detailKo ? (
              <p className="mt-0.5 text-[11px] leading-snug text-[#aeaeb2]">
                {step.detailKo}
              </p>
            ) : null}
          </li>
        ))}
      </ol>

      {!view.running && view.summaryLineKo ? (
        <p className="mt-2 border-t border-[#ececec] pt-2 text-[13px] font-semibold leading-snug text-[#1d1d1f]">
          {view.summaryLineKo}
        </p>
      ) : null}

      <p className="mt-1.5 text-[12px] leading-snug text-[#6e6e73]">{view.goalKo}</p>
    </div>
  );
}
