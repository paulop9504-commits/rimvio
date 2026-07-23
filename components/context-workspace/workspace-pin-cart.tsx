"use client";

/**
 * Workspace pin cart — pinned candidates stay until user taps X.
 */

import { Pin, X } from "lucide-react";
import {
  applyWorkspaceTransition,
  domainLabelKo,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type WorkspacePinCartProps = {
  contextEventId: string;
  nodes: readonly ContextWorkspaceNode[];
  selectedId?: string | null;
  onSelect?: (nodeId: string) => void;
  className?: string;
};

export function WorkspacePinCart({
  contextEventId,
  nodes,
  selectedId = null,
  onSelect,
  className,
}: WorkspacePinCartProps) {
  const pinned = nodes.filter((n) => n.bookmarked);
  if (pinned.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-auto mx-auto w-full max-w-xl rounded-[18px] bg-white/95 px-2.5 py-2 shadow-[0_6px_20px_rgba(25,31,40,0.12)] ring-1 ring-black/[0.04]",
        className,
      )}
      data-workspace-pin-cart
    >
      <div className="mb-1.5 flex items-center gap-1.5 px-1">
        <Pin className="h-3.5 w-3.5 text-[#3182f6]" strokeWidth={2.5} />
        <p className="text-[11px] font-bold text-[#191f28]">
          {copy.globe.workspacePinCartTitle(pinned.length)}
        </p>
        <p className="text-[10px] text-[#8b95a1]">
          {copy.globe.workspacePinCartHint}
        </p>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {pinned.map((node) => (
          <div
            key={node.id}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full border pl-2.5 pr-1 py-1",
              selectedId === node.id
                ? "border-[#3182f6] bg-[#e8f3ff]"
                : "border-black/[0.06] bg-[#f9fafb]",
            )}
          >
            <button
              type="button"
              className="max-w-[7.5rem] truncate text-left text-[11px] font-semibold text-[#191f28]"
              onClick={() => onSelect?.(node.id)}
            >
              <span className="text-[#8b95a1]">
                {domainLabelKo(node.kind)} ·{" "}
              </span>
              {node.title}
            </button>
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-full text-[#8b95a1] hover:bg-white hover:text-[#f04452]"
              aria-label={copy.globe.workspacePinUnpin}
              onClick={() =>
                applyWorkspaceTransition({
                  contextEventId,
                  op: "bookmark",
                  nodeIds: [node.id],
                  pin: false,
                })
              }
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
