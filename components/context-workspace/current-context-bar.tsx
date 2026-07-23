/**
 * Current Context bar — OS-style “what project am I editing”.
 * @see docs/adr/022-context-workspace-first.md
 */

import {
  estimateWorkspaceProgressPercent,
  relativeWorkspaceUpdateKo,
} from "@/lib/context-workspace/current-context-metrics";
import { domainLabelKo, type ContextWorkspaceState } from "@/lib/context-workspace/types";
import { cn } from "@/lib/utils";

export type CurrentContextBarProps = {
  state: ContextWorkspaceState;
  /** Project title (trip / place). Falls back to workspace summary. */
  projectTitleKo?: string | null;
  className?: string;
};

function statusLabelKo(status: ContextWorkspaceState["status"]): string {
  if (status === "committed") {
    return "Committed";
  }
  if (status === "committing") {
    return "Committing";
  }
  if (status === "closed") {
    return "Closed";
  }
  return "Editing";
}

function agentLabelKo(domain: ContextWorkspaceState["domain"]): string {
  return `${domainLabelKo(domain)} Scout`;
}

export { estimateWorkspaceProgressPercent };

export function CurrentContextBar({
  state,
  projectTitleKo,
  className,
}: CurrentContextBarProps) {
  const title =
    projectTitleKo?.trim() ||
    state.summaryKo?.trim() ||
    "Context";
  const progress = estimateWorkspaceProgressPercent(state);

  return (
    <div
      className={cn(
        "shrink-0 border-b border-black/5 bg-white/95 px-4 py-2.5",
        className,
      )}
      data-current-context-bar
      data-workspace-status={state.status}
      data-workspace-domain={state.domain}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold tracking-tight text-foreground">
            <span aria-hidden className="mr-1">
              ✈
            </span>
            {title}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {state.query.trim() || state.summaryKo}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
          Draft
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] sm:grid-cols-4">
        <div className="min-w-0">
          <dt className="text-muted-foreground">Status</dt>
          <dd className="truncate font-medium text-foreground">
            {statusLabelKo(state.status)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Agent</dt>
          <dd className="truncate font-medium text-foreground">
            {agentLabelKo(state.domain)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Auto Save</dt>
          <dd className="truncate font-medium text-foreground">ON</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Last Update</dt>
          <dd className="truncate font-medium text-foreground">
            {relativeWorkspaceUpdateKo(state.updatedAtIso)}
          </dd>
        </div>
      </dl>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
          <div
            className="h-full rounded-full bg-foreground/70 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
            data-workspace-progress={progress}
          />
        </div>
        <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
          {progress}%
        </span>
      </div>
    </div>
  );
}
