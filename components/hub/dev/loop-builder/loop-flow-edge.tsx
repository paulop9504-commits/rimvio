"use client";

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import type { LoopFlowEdgeData } from "@/lib/agent-os/loop-builder/graph-sync";
import { cn } from "@/lib/utils";

type LoopEdgeProps = EdgeProps & { data?: LoopFlowEdgeData };

function LabeledLoopEdge(props: LoopEdgeProps) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  });

  const label = String(props.label ?? "");
  const highlighted = props.data?.highlighted;

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={props.markerEnd}
        style={{
          stroke: highlighted ? "#7c3aed" : "#94a3b8",
          strokeWidth: highlighted ? 2.5 : 1.75,
        }}
      />
      {label ? (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className={cn(
              "rounded-md border px-1.5 py-0.5 text-[8px] font-bold tracking-wide shadow-sm",
              label === "YES" || label === "PASS"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : label === "NO" || label === "FAIL"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-[#e5e7eb] bg-white text-[#6b7280]",
              highlighted && "border-violet-300 bg-violet-50 text-violet-700",
            )}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

function LoopBackEdge(props: LoopEdgeProps) {
  const [path] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    curvature: 0.45,
  });

  return (
    <BaseEdge
      path={path}
      markerEnd={props.markerEnd}
      style={{
        stroke: props.data?.highlighted ? "#7c3aed" : "#a78bfa",
        strokeWidth: 2,
        strokeDasharray: props.data?.animated ? "6 4" : undefined,
      }}
    />
  );
}

export const LOOP_FLOW_EDGE_TYPES = {
  loopLabeled: LabeledLoopEdge,
  loopBack: LoopBackEdge,
};
