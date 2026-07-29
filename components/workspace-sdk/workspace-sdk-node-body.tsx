"use client";

/**
 * Workspace SDK Node body — projection by surface (ADR-034).
 * Candidate cards stay for lodging picks; map/pipeline/dashboard are teasers.
 */

import type { ContextWorkspaceNode } from "@/lib/context-workspace";
import type { WorkspaceNodeProjectionModel } from "@/lib/reality-os/node-projection-model";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

function formatNodeLine(node: ContextWorkspaceNode): string {
  const price = node.amountLabel?.trim() || null;
  const rating =
    node.rating != null && Number.isFinite(node.rating)
      ? `★ ${node.rating.toFixed(1)}`
      : null;
  return [node.title, rating, price].filter(Boolean).join(" · ");
}

export type WorkspaceSdkNodeBodyProps = {
  model: WorkspaceNodeProjectionModel;
  nodes: readonly ContextWorkspaceNode[];
  selectedId: string | null;
  focusSlotId: string;
  emptyHintKo: string;
  onSelectNode: (id: string) => void;
  onFocusNext?: () => void;
  showFlightSkip?: boolean;
};

export function WorkspaceSdkNodeBody({
  model,
  nodes,
  selectedId,
  focusSlotId,
  emptyHintKo,
  onSelectNode,
  onFocusNext,
  showFlightSkip,
}: WorkspaceSdkNodeBodyProps) {
  if (model.surface === "pipeline") {
    return (
      <ol
        className="space-y-2"
        data-workspace-node-pipeline
        aria-label="거래 파이프라인"
      >
        {model.stages.map((stage, index) => (
          <li
            key={stage.slotId}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] ring-1",
              stage.state === "current"
                ? "bg-[#e8f3ff] font-medium text-[#191f28] ring-[#3182f6]/25"
                : stage.state === "done"
                  ? "bg-[#f9fafb] text-[#4e5968] ring-black/[0.04]"
                  : "bg-white text-[#8b95a1] ring-black/[0.04]",
            )}
            data-pipeline-state={stage.state}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                stage.state === "current"
                  ? "bg-[#3182f6] text-white"
                  : stage.state === "done"
                    ? "bg-[#d1d6db] text-white"
                    : "bg-[#f2f4f6] text-[#8b95a1]",
              )}
            >
              {stage.state === "done" ? "✓" : index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate">{stage.labelKo}</span>
            {stage.state === "current" ? (
              <span className="shrink-0 text-[11px] text-[#3182f6]">지금</span>
            ) : null}
          </li>
        ))}
      </ol>
    );
  }

  if (model.surface === "map") {
    return (
      <div
        className="overflow-hidden rounded-2xl bg-gradient-to-b from-[#e8f3ff] to-[#f9fafb] px-4 py-5 ring-1 ring-black/[0.04]"
        data-workspace-node-map
      >
        <p className="text-[11px] font-medium text-[#3182f6]">
          {model.spatial.headlineKo}
        </p>
        <div className="relative mx-auto mt-4 h-28 w-full max-w-[220px]">
          <div className="absolute inset-0 rounded-full border border-dashed border-[#3182f6]/35" />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3182f6] shadow-sm" />
          <p className="absolute inset-x-2 bottom-2 truncate text-center text-[12px] font-medium text-[#191f28]">
            {model.spatial.pinHintKo}
          </p>
        </div>
        <p className="mt-3 text-center text-[13px] text-[#4e5968]">
          {model.spatial.bodyKo}
        </p>
        {showFlightSkip && onFocusNext ? (
          <button
            type="button"
            className="mt-3 w-full text-[13px] font-semibold text-[#3182f6]"
            onClick={onFocusNext}
            data-workspace-sdk-focus-next
          >
            {copy.globe.workspaceSdkFocusNext}
          </button>
        ) : null}
      </div>
    );
  }

  if (model.surface === "dashboard") {
    return (
      <div
        className="grid grid-cols-2 gap-2"
        data-workspace-node-dashboard
      >
        <p className="col-span-2 text-[11px] font-medium text-[#8b95a1]">
          {model.dashboard.headlineKo}
        </p>
        {model.dashboard.metrics.map((metric) => (
          <div
            key={metric.labelKo}
            className="rounded-2xl bg-[#f9fafb] px-3 py-3 ring-1 ring-black/[0.04]"
          >
            <p className="text-[11px] text-[#8b95a1]">{metric.labelKo}</p>
            <p className="mt-1 text-[14px] font-semibold text-[#191f28]">
              {metric.valueKo}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="rounded-2xl bg-[#f9fafb] px-3 py-6 text-center">
        <p className="text-[13px] text-[#8b95a1]">{emptyHintKo}</p>
        {focusSlotId === "flight" && onFocusNext ? (
          <button
            type="button"
            className="mt-3 text-[13px] font-semibold text-[#3182f6]"
            onClick={onFocusNext}
            data-workspace-sdk-focus-next
          >
            {copy.globe.workspaceSdkFocusNext}
          </button>
        ) : null}
      </div>
    );
  }

  const selected =
    nodes.find((n) => n.id === selectedId) ?? nodes[0] ?? null;

  return (
    <ul className="space-y-2" data-workspace-node-cards>
      {nodes.map((node) => {
        const active = (selectedId ?? selected?.id) === node.id;
        return (
          <li key={node.id}>
            <button
              type="button"
              className={cn(
                "w-full rounded-2xl px-3 py-3 text-left text-[13px] shadow-sm ring-1",
                active
                  ? "bg-[#e8f3ff] ring-[#3182f6]/30"
                  : "bg-white ring-black/[0.04]",
              )}
              onClick={() => onSelectNode(node.id)}
            >
              {formatNodeLine(node)}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
