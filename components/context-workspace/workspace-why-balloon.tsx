"use client";

/**
 * WHY balloon — Action · Reason · Impact on selected / last-changed node.
 */

import type { WorkspaceWhyEntry } from "@/lib/context-workspace/types";
import { cn } from "@/lib/utils";

export type WorkspaceWhyBalloonProps = {
  why: WorkspaceWhyEntry;
  className?: string;
  onDismiss?: () => void;
};

export function WorkspaceWhyBalloon({
  why,
  className,
  onDismiss,
}: WorkspaceWhyBalloonProps) {
  return (
    <div
      className={cn(
        "max-w-[240px] rounded-2xl bg-white/95 p-3 text-left shadow-md ring-1 ring-black/10",
        className,
      )}
      data-workspace-why-balloon
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          WHY
        </p>
        {onDismiss ? (
          <button
            type="button"
            className="text-[11px] text-muted-foreground"
            onClick={onDismiss}
            aria-label="닫기"
          >
            ✕
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-[13px] font-semibold text-foreground">
        {why.actionKo}
      </p>
      <div className="mt-2 space-y-1.5">
        <div>
          <p className="text-[10px] font-medium text-muted-foreground">Reason</p>
          <ul className="mt-0.5 space-y-0.5">
            {why.reasonsKo.map((line) => (
              <li key={line} className="text-[11px] text-foreground">
                · {line}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-medium text-muted-foreground">Impact</p>
          <ul className="mt-0.5 space-y-0.5">
            {why.impactsKo.map((line) => (
              <li key={line} className="text-[11px] text-foreground">
                · {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
