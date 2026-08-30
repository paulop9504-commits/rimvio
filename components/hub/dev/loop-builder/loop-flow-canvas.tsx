"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
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
import type { LoopDefinition, LoopNodeKind } from "@/lib/agent-os/loop-builder/types";
import {
  flowGraphToLoop,
  inferEdgeKindForConnection,
  loopToFlowEdges,
  loopToFlowNodes,
  resolveFlowNodeType,
  type LoopFlowEdgeData,
  type LoopFlowNodeData,
} from "@/lib/agent-os/loop-builder/graph-sync";
import { LOOP_FLOW_NODE_TYPES } from "@/components/hub/dev/loop-builder/loop-flow-node";
import { LOOP_FLOW_EDGE_TYPES } from "@/components/hub/dev/loop-builder/loop-flow-edge";
import { createLoopNode } from "@/lib/agent-os/loop-builder/nodes";

export type LoopFlowCanvasProps = {
  readonly loop: LoopDefinition;
  readonly selectedNodeId: string | null;
  readonly onSelectNode: (id: string | null) => void;
  readonly onChangeLoop: (loop: LoopDefinition) => void;
  readonly highlightNodeIds?: readonly string[];
  readonly highlightEdgeKeys?: readonly string[];
  readonly testStatusByNodeId?: Readonly<Record<string, LoopFlowNodeData["testStatus"]>>;
  readonly runningNodeId?: string | null;
};

function edgeLabelForKind(kind: ReturnType<typeof inferEdgeKindForConnection>): string | undefined {
  if (kind === "yes") return "YES";
  if (kind === "no") return "NO";
  if (kind === "pass") return "PASS";
  if (kind === "fail") return "FAIL";
  return undefined;
}

export function LoopFlowCanvas(props: LoopFlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const flowOptions = useMemo(
    () => ({
      testStatusByNodeId: props.testStatusByNodeId,
      highlightNodeIds: props.highlightNodeIds,
      runningNodeId: props.runningNodeId,
    }),
    [props.testStatusByNodeId, props.highlightNodeIds, props.runningNodeId],
  );

  const animatedEdgeKeys = useMemo(() => {
    if (!props.runningNodeId) return [];
    return props.loop.edges.filter((e) => e.to === props.runningNodeId).map((e) => `${e.from}->${e.to}`);
  }, [props.loop.edges, props.runningNodeId]);

  const [nodes, setNodes] = useState<Node<LoopFlowNodeData>[]>(() =>
    loopToFlowNodes(props.loop, flowOptions).map((n) => ({
      ...n,
      selected: n.id === props.selectedNodeId,
    })),
  );
  const [edges, setEdges] = useState<Edge<LoopFlowEdgeData>[]>(() =>
    loopToFlowEdges(props.loop, {
      highlightEdgeKeys: props.highlightEdgeKeys,
      animatedEdgeKeys,
    }),
  );

  useEffect(() => {
    setNodes(
      loopToFlowNodes(props.loop, flowOptions).map((n) => ({
        ...n,
        selected: n.id === props.selectedNodeId,
      })),
    );
    setEdges(
      loopToFlowEdges(props.loop, {
        highlightEdgeKeys: props.highlightEdgeKeys,
        animatedEdgeKeys,
      }),
    );
  }, [props.loop, props.selectedNodeId, props.highlightEdgeKeys, flowOptions, animatedEdgeKeys]);

  const syncLoop = useCallback(
    (nextNodes: Node<LoopFlowNodeData>[], nextEdges: Edge<LoopFlowEdgeData>[]) => {
      props.onChangeLoop(flowGraphToLoop(props.loop, nextNodes, nextEdges));
    },
    [props],
  );

  const onNodesChange: OnNodesChange<Node<LoopFlowNodeData>> = useCallback(
    (changes) => {
      setNodes((nds) => {
        const next = applyNodeChanges(changes, nds);
        const shouldSync =
          changes.some((c) => c.type === "position" && c.dragging === false) ||
          changes.some((c) => c.type === "remove");
        if (shouldSync) syncLoop(next, edges);
        return next;
      });
    },
    [edges, syncLoop],
  );

  const onEdgesChange: OnEdgesChange<Edge<LoopFlowEdgeData>> = useCallback(
    (changes) => {
      setEdges((eds) => {
        const next = applyEdgeChanges(changes, eds);
        if (changes.some((c) => c.type === "remove")) syncLoop(nodes, next);
        return next;
      });
    },
    [nodes, syncLoop],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      if (!sourceNode) return;
      const kind = inferEdgeKindForConnection(sourceNode.data.loopNode, connection.sourceHandle);
      setEdges((eds) => {
        const next = addEdge(
          {
            ...connection,
            id: `e_${connection.source}_${connection.target}_${kind}_${Date.now()}`,
            type: kind === "next" ? "default" : "loopLabeled",
            label: edgeLabelForKind(kind),
            data: { edgeKind: kind },
            markerEnd: { type: "arrowclosed", color: "#94a3b8" },
          },
          eds,
        );
        syncLoop(nodes, next);
        return next;
      });
    },
    [nodes, syncLoop],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData("application/rimvio-loop-kind") as LoopNodeKind;
      if (!kind || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 100,
        y: event.clientY - bounds.top - 40,
      };

      const id = `n_${kind.toLowerCase()}_${Date.now()}`;
      const loopNode = createLoopNode(kind, id);
      const newNode: Node<LoopFlowNodeData> = {
        id,
        type: resolveFlowNodeType(kind),
        position,
        data: { loopNode },
      };

      const nextNodes = [...nodes, newNode];
      setNodes(nextNodes);
      props.onSelectNode(id);
      syncLoop(nextNodes, edges);
    },
    [nodes, edges, props, syncLoop],
  );

  return (
    <div ref={reactFlowWrapper} className="h-full min-h-0 w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={LOOP_FLOW_NODE_TYPES}
        edgeTypes={LOOP_FLOW_EDGE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
        maxZoom={1.75}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode="Shift"
        onSelectionChange={({ nodes: selectedNodes }) => {
          props.onSelectNode(selectedNodes[0]?.id ?? null);
        }}
        proOptions={{ hideAttribution: true }}
        className="bg-[#f8f9fb]"
      >
        <Background gap={20} size={1} color="#e5e7eb" />
        <Controls showInteractive={false} className="!rounded-lg !border !border-[#e5e7eb] !shadow-sm" />
        <MiniMap
          pannable
          zoomable
          className="!rounded-lg !border !border-[#e5e7eb] !bg-white/90 !shadow-sm"
          nodeColor={(n) => {
            const kind = (n.data as LoopFlowNodeData | undefined)?.loopNode.kind;
            if (kind === "CONDITION" || kind === "DECIDE") return "#fcd34d";
            if (kind === "TRIGGER") return "#7dd3fc";
            if (kind === "COMPLETE") return "#86efac";
            if (kind === "FAIL") return "#fca5a5";
            return "#c4b5fd";
          }}
        />
        <Panel
          position="top-left"
          className="rounded-lg border border-[#e5e7eb] bg-white/90 px-2 py-1 text-[9px] text-[#6b7280] shadow-sm backdrop-blur"
        >
          {props.loop.nodes.length} nodes · {props.loop.edges.length} edges
        </Panel>
      </ReactFlow>
    </div>
  );
}
