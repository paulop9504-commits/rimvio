import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";

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
}): BrainSurfaceOntologyPeekLayout {
  const width = input.width ?? 300;
  const mediaHeight = input.mediaHeight ?? 112;
  const count = Math.min(input.satellites.length, MAX_NODES);
  const rootStem = { x: width / 2, y: mediaHeight - 2 };

  if (count === 0) {
    return {
      width,
      height: mediaHeight + 8,
      mediaHeight,
      rootStem,
      nodes: [],
    };
  }

  const nodes: BrainSurfaceOntologyPeekLayout["nodes"] = [];
  const arcTop = mediaHeight + 10;

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
  return {
    width,
    height: lowest + 10,
    mediaHeight,
    rootStem,
    nodes,
  };
}
