import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";
import { separateOntologyGraphNodes } from "@/lib/globe/separate-ontology-graph-nodes";

export type BrainSurfaceOntologyPeekLayout = {
  width: number;
  height: number;
  mediaHeight: number;
  rootStem: { x: number; y: number };
  nodes: Array<{
    candidateId: string;
    centerX: number;
    centerY: number;
    width: number;
    height: number;
  }>;
};

const MAX_NODES = 8;
const NODE_W = 62;
const NODE_H = 58;

export function layoutBrainSurfaceOntologyPeek(input: {
  satellites: readonly BrainSurfaceProjectionCandidate[];
  width?: number;
  mediaHeight?: number;
  /** Media hero rendered outside the graph (frameless shell above). */
  mediaExternal?: boolean;
}): BrainSurfaceOntologyPeekLayout {
  const width = input.width ?? 300;
  const mediaExternal = input.mediaExternal === true;
  const mediaHeight = mediaExternal ? 0 : (input.mediaHeight ?? 112);
  const count = Math.min(input.satellites.length, MAX_NODES);
  const rootStem = mediaExternal
    ? { x: width / 2, y: 0 }
    : { x: width / 2, y: mediaHeight - 2 };

  if (count === 0) {
    return {
      width,
      height: mediaExternal ? 0 : mediaHeight + 8,
      mediaHeight,
      rootStem,
      nodes: [],
    };
  }

  const nodes: BrainSurfaceOntologyPeekLayout["nodes"] = [];
  const arcTop = mediaExternal ? 16 : mediaHeight + 10;

  if (count === 1) {
    nodes.push({
      candidateId: input.satellites[0]!.id,
      centerX: width / 2,
      centerY: arcTop + NODE_H / 2 + 18,
      width: NODE_W,
      height: NODE_H,
    });
  } else if (count === 2) {
    const spread = 78;
    for (let index = 0; index < 2; index += 1) {
      const candidate = input.satellites[index]!;
      nodes.push({
        candidateId: candidate.id,
        centerX: width / 2 + (index === 0 ? -spread : spread),
        centerY: arcTop + NODE_H / 2 + 20,
        width: NODE_W,
        height: NODE_H,
      });
    }
  } else {
    const radius = Math.min(108, 56 + count * 8);
    const startAngle = Math.PI * 0.14;
    const endAngle = Math.PI * 0.86;
    for (let index = 0; index < count; index += 1) {
      const candidate = input.satellites[index]!;
      const t = index / Math.max(1, count - 1);
      const angle = startAngle + (endAngle - startAngle) * t;
      nodes.push({
        candidateId: candidate.id,
        centerX: width / 2 + Math.cos(angle) * radius,
        centerY: arcTop + Math.sin(angle) * radius * 0.68 + NODE_H / 2,
        width: NODE_W,
        height: NODE_H,
      });
    }
  }

  const lowest = Math.max(...nodes.map((node) => node.centerY + node.height / 2));
  const separated = separateOntologyGraphNodes({
    nodes: nodes.map((node) => ({
      id: node.candidateId,
      centerX: node.centerX,
      centerY: node.centerY,
      width: node.width,
      height: node.height,
    })),
    width,
    minHeight: lowest + 10,
    maxWidth: Math.max(width, 360),
  });

  return {
    width: separated.width,
    height: separated.height,
    mediaHeight,
    rootStem: {
      x: separated.width / 2,
      y: rootStem.y,
    },
    nodes: separated.nodes.map((node) => ({
      candidateId: node.id,
      centerX: node.centerX,
      centerY: node.centerY,
      width: node.width,
      height: node.height,
    })),
  };
}
