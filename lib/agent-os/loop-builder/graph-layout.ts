/**
 * Auto-layout for Loop graph — top-to-bottom with branch spread.
 */

import dagre from "dagre";
import type { LoopDefinition, LoopNode, LoopNodeKind } from "@/lib/agent-os/loop-builder/types";

const CONDITION_KINDS: readonly LoopNodeKind[] = ["CONDITION", "DECIDE"];

function nodeSize(kind: LoopNodeKind): { width: number; height: number } {
  if (CONDITION_KINDS.includes(kind)) return { width: 168, height: 96 };
  if (kind === "TRIGGER" || kind === "COMPLETE" || kind === "FAIL") return { width: 176, height: 56 };
  return { width: 208, height: 76 };
}

export function autoLayoutLoop(loop: LoopDefinition): LoopDefinition {
  if (loop.nodes.length === 0) return loop;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    nodesep: 72,
    ranksep: 88,
    marginx: 48,
    marginy: 48,
  });

  for (const node of loop.nodes) {
    const { width, height } = nodeSize(node.kind);
    g.setNode(node.id, { width, height });
  }

  for (const edge of loop.edges) {
    g.setEdge(edge.from, edge.to);
  }

  dagre.layout(g);

  const nodes: LoopNode[] = loop.nodes.map((node) => {
    const pos = g.node(node.id);
    const { width, height } = nodeSize(node.kind);
    return {
      ...node,
      layout: {
        x: pos.x - width / 2,
        y: pos.y - height / 2,
      },
    };
  });

  return { ...loop, nodes };
}

export function ensureLoopLayout(loop: LoopDefinition): LoopDefinition {
  const missing = loop.nodes.some((n) => !n.layout);
  if (!missing) return loop;
  return autoLayoutLoop(loop);
}

export function defaultPositionForIndex(index: number): { x: number; y: number } {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return { x: 120 + col * 240, y: 80 + row * 120 };
}
