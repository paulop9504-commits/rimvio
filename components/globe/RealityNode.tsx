"use client";

/**
 * RealityNode — base Globe node for Reality Desktop.
 * Read-only projection. No edit / mutate controls.
 */

import { MapPin, FolderOpen, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  RealityNodeKind,
  RealityProjectionNode,
} from "@/lib/globe/reality-interface";

export type RealityNodeProps = {
  readonly node: RealityProjectionNode;
  readonly selected?: boolean;
  readonly onSelect?: (node: RealityProjectionNode) => void;
  readonly className?: string;
};

function kindIcon(kind: RealityNodeKind) {
  if (kind === "region") return MapPin;
  if (kind === "context") return FolderOpen;
  return Box;
}

function kindEyebrow(kind: RealityNodeKind): string {
  if (kind === "region") return "Region Node";
  if (kind === "context") return "Context Node";
  return "Entity Node";
}

export function RealityNode({
  node,
  selected = false,
  onSelect,
  className,
}: RealityNodeProps) {
  const Icon = kindIcon(node.kind);

  return (
    <button
      type="button"
      data-reality-node
      data-reality-node-kind={node.kind}
      data-read-only="true"
      aria-pressed={selected}
      onClick={() => onSelect?.(node)}
      className={cn(
        "group w-full rounded-[1.1rem] bg-white/94 px-3.5 py-3 text-left shadow-[0_8px_28px_rgba(2,32,71,0.12)] ring-1 ring-black/[0.05] backdrop-blur-xl transition active:scale-[0.99]",
        selected && "ring-2 ring-[#3182f6]/35",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            node.kind === "context"
              ? "bg-[#3182f6]/12 text-[#3182f6]"
              : node.kind === "region"
                ? "bg-[#191f28]/06 text-[#4e5968]"
                : "bg-[#12b886]/12 text-[#0ca678]",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#8b95a1]">
            {kindEyebrow(node.kind)}
          </p>
          <p className="mt-0.5 truncate text-[15px] font-semibold text-[#191f28]">
            {node.titleKo}
          </p>
          {node.subtitleKo ? (
            <p className="mt-0.5 truncate text-[12px] text-[#6b7684]">
              {node.subtitleKo}
            </p>
          ) : null}
          {node.pathLabels.length > 0 ? (
            <p className="mt-1.5 truncate text-[11px] text-[#8b95a1]">
              {node.pathLabels.join(" · ")}
            </p>
          ) : null}
          {typeof node.childCount === "number" && node.childCount > 0 ? (
            <p className="mt-1 text-[11px] font-medium text-[#4e5968]">
              {node.childCount} inside
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}
