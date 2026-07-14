"use client";

import { Check, Loader2 } from "lucide-react";
import type { IntentExecutionTimelinePayload } from "@/lib/globe/assistant/context-agent-compose-thread-store";
import { cn } from "@/lib/utils";

export type GlobeIntentExecutionTimelineProps = {
  payload: IntentExecutionTimelinePayload;
  className?: string;
};

function LaneGlyph({ status }: { status: IntentExecutionTimelinePayload["lanes"][number]["status"] }) {
  if (status === "done") {
    return (
      <span
        className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#dcfce7] text-[#16a34a]"
        aria-hidden
      >
        <Check className="size-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center text-[#0071e3]" aria-hidden>
        <Loader2 className="size-3.5 animate-spin" />
      </span>
    );
  }
  if (status === "waiting") {
    return (
      <span
        className="flex size-4 shrink-0 items-center justify-center text-[10px] font-semibold text-[#ff9500]"
        aria-hidden
      >
        …
      </span>
    );
  }
  return (
    <span className="flex size-4 shrink-0 items-center justify-center text-[11px] text-[#c4cdd5]" aria-hidden>
      ○
    </span>
  );
}

/** Cursor-style Execution Timeline — lanes with done / active / waiting. */
export function GlobeIntentExecutionTimeline({
  payload,
  className,
}: GlobeIntentExecutionTimelineProps) {
  return (
    <div
      className={cn(
        "w-full max-w-[20rem] rounded-2xl bg-white/95 px-3 py-2.5 shadow-sm ring-1 ring-black/[0.06]",
        className,
      )}
      data-intent-execution-timeline
      data-timeline-status={payload.status}
      data-timeline-stage={payload.currentStage}
    >
      <ul className="space-y-0">
        {payload.lanes.map((lane, index) => (
          <li key={lane.id} data-execution-lane={lane.id} data-lane-status={lane.status}>
            {index > 0 ? (
              <div className="my-1.5 border-t border-black/[0.06]" aria-hidden />
            ) : null}
            <div className="flex items-start gap-2">
              <LaneGlyph status={lane.status} />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wide",
                    lane.status === "in_progress" || lane.status === "waiting"
                      ? "text-[#0071e3]"
                      : lane.status === "done"
                        ? "text-[#8e8e93]"
                        : "text-[#c7c7cc]",
                  )}
                >
                  {lane.titleKo}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[12px] leading-snug",
                    lane.status === "in_progress" && "font-medium text-[#1d1d1f]",
                    lane.status === "waiting" && "font-medium text-[#ff9500]",
                    lane.status === "done" && "text-[#636366]",
                    lane.status === "pending" && "text-[#aeaeb2]",
                  )}
                >
                  {lane.detailKo}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
