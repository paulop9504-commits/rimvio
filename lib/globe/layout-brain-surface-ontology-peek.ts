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

const NODE_W = 68;
const NODE_H = 76;
const NODE_GAP = 10;
const GRAPH_PAD_X = 14;
const GRAPH_TOP = 8;
const STEM_DROP = 14;

export function layoutBrainSurfaceOntologyPeek(input: {
  satellites: readonly BrainSurfaceProjectionCandidate[];
  width?: number;
  mediaHeight?: number;
}): BrainSurfaceOntologyPeekLayout {
  const width = input.width ?? 280;
  const mediaHeight = input.mediaHeight ?? 118;
  const count = Math.min(input.satellites.length, 5);
  const rowWidth =
    count > 0 ? count * NODE_W + Math.max(0, count - 1) * NODE_GAP : 0;
  const graphWidth = Math.max(width - GRAPH_PAD_X * 2, rowWidth);
  const graphLeft = (width - graphWidth) / 2;
  const graphHeight =
    count > 0 ? GRAPH_TOP + STEM_DROP + NODE_H + 10 : STEM_DROP;

  const nodes = input.satellites.slice(0, 5).map((candidate, index) => {
    const total = Math.min(input.satellites.length, 5);
    const rowStart =
      graphLeft + (graphWidth - (total * NODE_W + (total - 1) * NODE_GAP)) / 2;
    const left = rowStart + index * (NODE_W + NODE_GAP);
    const top = mediaHeight + GRAPH_TOP + STEM_DROP;
    return {
      candidateId: candidate.id,
      centerX: left + NODE_W / 2,
      centerY: top + NODE_H / 2,
      width: NODE_W,
      height: NODE_H,
    };
  });

  return {
    width,
    height: mediaHeight + graphHeight,
    mediaHeight,
    rootStem: { x: width / 2, y: mediaHeight },
    nodes,
  };
}
