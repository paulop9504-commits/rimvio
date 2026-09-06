"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import {
  harnessNodeAccent,
  type HarnessFlowNodeData,
} from "@/lib/harness/builder-graph";

function HarnessFlowNodeInner(props: NodeProps<Node<HarnessFlowNodeData>>) {
  const node = props.data.harnessNode;
  const accent = harnessNodeAccent(node.type);
  return (
    <div
      className="min-w-[180px] rounded-xl border bg-white px-3 py-2 shadow-sm"
      style={{
        borderColor: props.selected ? accent : "#E2E8F0",
        boxShadow: props.selected ? `0 0 0 2px ${accent}33` : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#94A3B8]" />
      <div className="flex items-center gap-2">
        <span
          className="rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white"
          style={{ backgroundColor: accent }}
        >
          {node.type}
        </span>
        <span className="text-[12px] font-semibold text-[#0F172A]">{node.name}</span>
      </div>
      {node.description ? (
        <p className="mt-1 line-clamp-2 text-[10px] text-[#64748B]">{node.description}</p>
      ) : null}
      <p className="mt-1 text-[10px] text-[#94A3B8]">
        actions {node.actions.length} · next {(node.next ?? []).length}
      </p>
      <Handle type="source" position={Position.Bottom} className="!bg-[#94A3B8]" />
    </div>
  );
}

export const HarnessFlowNode = memo(HarnessFlowNodeInner);

export const HARNESS_FLOW_NODE_TYPES = {
  harnessNode: HarnessFlowNode,
};
