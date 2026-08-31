/**
 * Sync Loop Definition ↔ React Flow graph elements.
 */

import type { Edge, Node } from "@xyflow/react";
import type { LoopDefinition, LoopEdge, LoopEdgeKind, LoopNode } from "@/lib/agent-os/loop-builder/types";
import { defaultPositionForIndex } from "@/lib/agent-os/loop-builder/graph-layout";

export type LoopFlowNodeData = {
  readonly loopNode: LoopNode;
  readonly testStatus?: "pending" | "running" | "pass" | "fail" | "skip";
  readonly highlighted?: boolean;
  readonly dimmed?: boolean;
};

export type LoopFlowEdgeData = {
  readonly edgeKind: LoopEdgeKind;
  readonly highlighted?: boolean;
  readonly animated?: boolean;
};

const CONDITION_KINDS = new Set(["CONDITION", "DECIDE"]);

export function edgeKindLabel(kind: LoopEdgeKind): string {
  switch (kind) {
    case "yes":
      return "YES";
    case "no":
      return "NO";
    case "pass":
      return "PASS";
    case "fail":
      return "FAIL";
    default:
      return "";
  }
}

export function resolveFlowNodeType(kind: LoopNode["kind"]): string {
  if (kind === "TRIGGER") return "loopTrigger";
  if (CONDITION_KINDS.has(kind)) return "loopCondition";
  if (kind === "ASK_USER" || kind === "APPROVAL") return "loopHuman";
  if (kind === "COMPLETE" || kind === "FAIL") return "loopTerminal";
  if (kind === "RETRY" || kind === "REPLAN") return "loopLoop";
  if (kind === "VERIFY") return "loopVerify";
  return "loopAction";
}

export function loopToFlowNodes(
  loop: LoopDefinition,
  options?: {
    readonly testStatusByNodeId?: Readonly<Record<string, LoopFlowNodeData["testStatus"]>>;
    readonly highlightNodeIds?: readonly string[];
    readonly runningNodeId?: string | null;
  },
): Node<LoopFlowNodeData>[] {
  const highlightSet = new Set(options?.highlightNodeIds ?? []);
  const hasHighlight = highlightSet.size > 0;

  return loop.nodes.map((node, index) => {
    const pos = node.layout ?? defaultPositionForIndex(index);
    let testStatus = options?.testStatusByNodeId?.[node.id];
    if (options?.runningNodeId === node.id) testStatus = "running";

    return {
      id: node.id,
      type: resolveFlowNodeType(node.kind),
      position: { x: pos.x, y: pos.y },
      data: {
        loopNode: node,
        testStatus,
        highlighted: highlightSet.has(node.id),
        dimmed: hasHighlight && !highlightSet.has(node.id),
      },
      draggable: true,
      selectable: true,
    };
  });
}

export function loopToFlowEdges(
  loop: LoopDefinition,
  options?: {
    readonly highlightEdgeKeys?: readonly string[];
    readonly animatedEdgeKeys?: readonly string[];
  },
): Edge<LoopFlowEdgeData>[] {
  const nodeIds = new Set(loop.nodes.map((n) => n.id));

  return loop.edges
    .filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to))
    .map((e, index) => {
      const key = `${e.from}->${e.to}`;
      const isLoopBack = loop.nodes.findIndex((n) => n.id === e.to) < loop.nodes.findIndex((n) => n.id === e.from);
      const label = edgeKindLabel(e.kind);
      const highlighted = options?.highlightEdgeKeys?.includes(key) ?? false;
      const animated = options?.animatedEdgeKeys?.includes(key) ?? false;

      return {
        id: `e_${e.from}_${e.to}_${e.kind}_${index}`,
        source: e.from,
        target: e.to,
        type: label ? "loopLabeled" : isLoopBack ? "loopBack" : "default",
        label,
        data: {
          edgeKind: e.kind,
          highlighted,
          animated,
        },
        animated: animated || isLoopBack,
        style: highlighted
          ? { stroke: "#7c3aed", strokeWidth: 2.5 }
          : isLoopBack
            ? { stroke: "#a78bfa", strokeWidth: 2 }
            : undefined,
        markerEnd: { type: "arrowclosed" as const, color: highlighted ? "#7c3aed" : "#94a3b8" },
        sourceHandle: branchHandleForSource(e.kind),
        targetHandle: branchHandleForTarget(e.kind),
      };
    });
}

function branchHandleForSource(kind: LoopEdgeKind): string | undefined {
  if (kind === "yes" || kind === "pass") return "yes";
  if (kind === "no" || kind === "fail") return "no";
  return "next";
}

function branchHandleForTarget(kind: LoopEdgeKind): string | undefined {
  if (kind === "yes" || kind === "pass") return "yes-in";
  if (kind === "no" || kind === "fail") return "no-in";
  return "in";
}

export function flowGraphToLoop(
  loop: LoopDefinition,
  nodes: readonly Node<LoopFlowNodeData>[],
  edges: readonly Edge<LoopFlowEdgeData>[],
): LoopDefinition {
  const loopNodes: LoopNode[] = nodes.map((n) => ({
    ...n.data.loopNode,
    layout: { x: n.position.x, y: n.position.y },
  }));

  const loopEdges: LoopEdge[] = edges.map((e) => ({
    from: e.source,
    to: e.target,
    kind: e.data?.edgeKind ?? inferEdgeKind(e),
  }));

  const entryId =
    loop.entryId && loopNodes.some((n) => n.id === loop.entryId)
      ? loop.entryId
      : loopNodes.find((n) => n.kind === "TRIGGER")?.id ?? loopNodes[0]?.id ?? loop.entryId;

  return {
    ...loop,
    source: "visual",
    nodes: loopNodes,
    edges: loopEdges,
    entryId,
  };
}

function inferEdgeKind(edge: Edge<LoopFlowEdgeData>): LoopEdgeKind {
  const label = String(edge.label ?? "").toUpperCase();
  if (label === "YES") return "yes";
  if (label === "NO") return "no";
  if (label === "PASS") return "pass";
  if (label === "FAIL") return "fail";
  if (edge.sourceHandle === "yes") return "yes";
  if (edge.sourceHandle === "no") return "no";
  return "next";
}

export function connectNodesWithKind(
  loop: LoopDefinition,
  fromId: string,
  toId: string,
  kind: LoopEdgeKind = "next",
): LoopDefinition {
  if (fromId === toId) return loop;
  const exists = loop.edges.some((e) => e.from === fromId && e.to === toId && e.kind === kind);
  if (exists) return loop;
  return {
    ...loop,
    edges: [...loop.edges, { from: fromId, to: toId, kind }],
  };
}

export function removeLoopNodes(loop: LoopDefinition, nodeIds: readonly string[]): LoopDefinition {
  const drop = new Set(nodeIds);
  return {
    ...loop,
    nodes: loop.nodes.filter((n) => !drop.has(n.id)),
    edges: loop.edges.filter((e) => !drop.has(e.from) && !drop.has(e.to)),
    entryId: drop.has(loop.entryId)
      ? (loop.nodes.find((n) => !drop.has(n.id) && n.kind === "TRIGGER")?.id ??
        loop.nodes.find((n) => !drop.has(n.id))?.id ??
        loop.entryId)
      : loop.entryId,
  };
}

export function duplicateLoopNode(loop: LoopDefinition, nodeId: string): LoopDefinition {
  const source = loop.nodes.find((n) => n.id === nodeId);
  if (!source) return loop;
  const id = `${nodeId}_copy_${Date.now()}`;
  const copy: LoopNode = {
    ...source,
    id,
    label: `${source.label} (copy)`,
    layout: source.layout
      ? { x: source.layout.x + 32, y: source.layout.y + 32 }
      : undefined,
  };
  return { ...loop, nodes: [...loop.nodes, copy] };
}

export function inferEdgeKindForConnection(
  sourceNode: LoopNode,
  sourceHandle: string | null | undefined,
): LoopEdgeKind {
  if (sourceNode.kind === "CONDITION" || sourceNode.kind === "DECIDE" || sourceNode.kind === "VERIFY") {
    if (sourceHandle === "yes") return sourceNode.kind === "VERIFY" ? "pass" : "yes";
    if (sourceHandle === "no") return sourceNode.kind === "VERIFY" ? "fail" : "no";
  }
  return "next";
}
