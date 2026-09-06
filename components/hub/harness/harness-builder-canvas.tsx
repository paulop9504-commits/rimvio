"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Harness } from "@/lib/rimvio-protocol/harness/schema";
import {
  applyFlowEdgesToHarness,
  applyFlowPositionsToHarness,
  harnessToFlowEdges,
  harnessToFlowNodes,
  type HarnessFlowNodeData,
} from "@/lib/harness/builder-graph";
import { HARNESS_FLOW_NODE_TYPES } from "@/components/hub/harness/harness-flow-node";

export function HarnessBuilderCanvas({
  harness,
  selectedNodeId,
  onSelectNode,
  onChangeHarness,
}: {
  harness: Harness;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onChangeHarness: (harness: Harness) => void;
}) {
  const [nodes, setNodes] = useState<Node<HarnessFlowNodeData>[]>(() =>
    harnessToFlowNodes(harness).map((n) => ({ ...n, selected: n.id === selectedNodeId })),
  );
  const [edges, setEdges] = useState<Edge[]>(() => harnessToFlowEdges(harness));

  useEffect(() => {
    setNodes(
      harnessToFlowNodes(harness).map((n) => ({ ...n, selected: n.id === selectedNodeId })),
    );
    setEdges(harnessToFlowEdges(harness));
  }, [harness, selectedNodeId]);

  const onNodesChange: OnNodesChange<Node<HarnessFlowNodeData>> = useCallback(
    (changes) => {
      setNodes((prev) => {
        const next = applyNodeChanges(changes, prev);
        const moved = changes.some((c) => c.type === "position" && c.dragging === false);
        if (moved) {
          onChangeHarness(applyFlowPositionsToHarness(harness, next));
        }
        return next;
      });
    },
    [harness, onChangeHarness],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((prev) => {
        const next = applyEdgeChanges(changes, prev);
        if (changes.some((c) => c.type === "remove")) {
          onChangeHarness(applyFlowEdgesToHarness(harness, next));
        }
        return next;
      });
    },
    [harness, onChangeHarness],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((prev) => {
        const next = addEdge({ ...connection, style: { stroke: "#CBD5E1" } }, prev);
        onChangeHarness(applyFlowEdgesToHarness(harness, next));
        return next;
      });
    },
    [harness, onChangeHarness],
  );

  return (
    <div className="h-full min-h-[420px] w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={HARNESS_FLOW_NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, n) => onSelectNode(n.id)}
        onPaneClick={() => onSelectNode(null)}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} color="#E2E8F0" />
        <Controls />
        <MiniMap pannable zoomable className="!bg-white" />
      </ReactFlow>
    </div>
  );
}
