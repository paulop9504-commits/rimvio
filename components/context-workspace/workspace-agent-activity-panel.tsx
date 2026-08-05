"use client";

/**
 * Cursor-like Agent Activity panel — Thought · Explore · Patch live tape.
 * Light Rimvio chrome (not dark IDE), same information density as Composer.
 */

import { useEffect, useState } from "react";
import {
  formatAgentActivityElapsed,
  readAgentActivityTranscript,
  subscribeAgentActivityTranscript,
  type AgentActivityEvent,
  type AgentActivityTranscript,
} from "@/lib/context-run/agent-activity-transcript";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type WorkspaceAgentActivityPanelProps = {
  contextEventId: string;
  className?: string;
  /** Collapse older events when finished. */
  compactWhenDone?: boolean;
};

function kindPrefix(kind: AgentActivityEvent["kind"]): string {
  switch (kind) {
    case "thought":
      return "💭";
    case "explore":
      return "⌕";
    case "tool":
      return "◎";
    case "patch":
      return "✎";
    case "verify":
      return "✓";
    default:
      return "·";
  }
}

function kindLabelKo(kind: AgentActivityEvent["kind"]): string {
  switch (kind) {
    case "thought":
      return copy.globe.agentActivityThought;
    case "explore":
      return copy.globe.agentActivityExplore;
    case "tool":
      return copy.globe.agentActivityTool;
    case "patch":
      return copy.globe.agentActivityPatch;
    case "verify":
      return copy.globe.agentActivityVerify;
    default:
      return copy.globe.agentActivityStatus;
  }
}

export function WorkspaceAgentActivityPanel({
  contextEventId,
  className,
  compactWhenDone = true,
}: WorkspaceAgentActivityPanelProps) {
  const [tape, setTape] = useState<AgentActivityTranscript | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const id = contextEventId.trim();
    const refresh = () => {
      const t = readAgentActivityTranscript();
      const match = t?.contextEventId === id ? t : null;
      setTape(match);
      if (match?.running) {
        setExpanded(true);
      } else if (match && compactWhenDone) {
        // Cursor: finished steps collapse — leave final artifact elsewhere.
        setExpanded(false);
      }
    };
    refresh();
    return subscribeAgentActivityTranscript(refresh);
  }, [compactWhenDone, contextEventId]);

  if (!tape || tape.events.length === 0) {
    return null;
  }

  const elapsed = formatAgentActivityElapsed(tape);
  const showTape = tape.running || expanded;
  const events = showTape ? tape.events : [];

  return (
    <div
      className={cn(
        "mb-2 overflow-hidden rounded-2xl bg-[#0f1419] px-3 py-2.5 text-left shadow-sm ring-1 ring-black/20",
        className,
      )}
      data-workspace-agent-activity
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <p className="text-[11px] font-semibold tracking-wide text-[#8b9cb3]">
          {tape.running
            ? copy.globe.agentActivityWorking(elapsed)
            : copy.globe.agentActivityWorked(elapsed)}
        </p>
        <span className="text-[10px] text-[#5c6b7a]">
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {showTape ? (
        <ul className="mt-2 space-y-2.5">
          {events.map((ev, i) => {
            const isLatest = i === events.length - 1;
            return (
              <li key={ev.id} className="min-w-0">
                <p
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wide",
                    isLatest && tape.running
                      ? "text-[#6cb6ff]"
                      : "text-[#5c6b7a]",
                  )}
                >
                  <span className="mr-1" aria-hidden>
                    {kindPrefix(ev.kind)}
                  </span>
                  {kindLabelKo(ev.kind)}
                  {ev.metricKo ? (
                    <span className="ml-1 font-normal normal-case text-[#8b9cb3]">
                      · {ev.metricKo}
                    </span>
                  ) : null}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[12px] leading-snug",
                    isLatest && tape.running
                      ? "animate-pulse font-medium text-[#e8eef5]"
                      : "text-[#c5d0dc]",
                  )}
                >
                  {ev.labelKo}
                </p>
                {ev.detailKo ? (
                  <p className="mt-0.5 text-[11px] leading-snug text-[#8b9cb3]">
                    {ev.detailKo}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-1.5 truncate text-[12px] text-[#c5d0dc]">
          {tape.events[tape.events.length - 1]?.labelKo}
        </p>
      )}
    </div>
  );
}
