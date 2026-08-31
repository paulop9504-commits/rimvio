"use client";

import { ChevronDown, ChevronRight, FileCode2, Folder } from "lucide-react";
import { useState } from "react";
import type { HubFileTreeNode, HubFileTouchState } from "@/lib/hub/dev/hub-file-tree";
import { cn } from "@/lib/utils";

type HubDevFileTreeProps = {
  readonly nodes: readonly HubFileTreeNode[];
  readonly onSelectPath?: (path: string) => void;
};

const TOUCH_DOT: Record<HubFileTouchState, string | null> = {
  idle: null,
  reading: "bg-cyan-400",
  modified: "bg-violet-500",
  created: "bg-emerald-500",
  running: "bg-amber-400 animate-pulse",
};

export function HubDevFileTree({ nodes, onSelectPath }: HubDevFileTreeProps) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node) => (
        <FileTreeNode key={node.id} node={node} depth={0} onSelectPath={onSelectPath} />
      ))}
    </ul>
  );
}

function FileTreeNode({
  node,
  depth,
  onSelectPath,
}: {
  node: HubFileTreeNode;
  depth: number;
  onSelectPath?: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const dot = TOUCH_DOT[node.touch];

  if (node.kind === "folder") {
    return (
      <li>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-[#f3f4f6]"
          style={{ paddingLeft: `${depth * 8 + 4}px` }}
        >
          {hasChildren ? (
            open ? <ChevronDown className="size-2.5 text-[#9ca3af]" /> : <ChevronRight className="size-2.5 text-[#9ca3af]" />
          ) : (
            <span className="size-2.5" />
          )}
          <Folder className="size-3 text-[#9ca3af]" />
          <span className="truncate text-[9px] font-medium text-[#6b7280]">{node.name}</span>
        </button>
        {open && hasChildren ? (
          <ul>
            {node.children!.map((child) => (
              <FileTreeNode key={child.id} node={child} depth={depth + 1} onSelectPath={onSelectPath} />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelectPath?.(node.path)}
        className={cn(
          "flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-violet-50",
          node.touch !== "idle" && "bg-violet-50/60",
        )}
        style={{ paddingLeft: `${depth * 8 + 16}px` }}
      >
        <FileCode2 className="size-3 shrink-0 text-[#9ca3af]" />
        <span className="truncate text-[9px] text-[#374151]">{node.name}</span>
        {dot ? <span className={cn("ml-auto size-1.5 shrink-0 rounded-full", dot)} /> : null}
      </button>
    </li>
  );
}
