export type OntologyGraphNodeBox = {
  id: string;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
};

export type SeparatedOntologyGraph = {
  nodes: OntologyGraphNodeBox[];
  width: number;
  height: number;
  minY: number;
};

const DEFAULT_GAP_PX = 10;
const MAX_SEPARATION_PASSES = 24;

function boxesOverlap(
  left: OntologyGraphNodeBox,
  right: OntologyGraphNodeBox,
  gap: number,
): boolean {
  const halfGap = gap / 2;
  return (
    Math.abs(left.centerX - right.centerX) <
      (left.width + right.width) / 2 + halfGap &&
    Math.abs(left.centerY - right.centerY) <
      (left.height + right.height) / 2 + halfGap
  );
}

function pushPairApart(
  left: OntologyGraphNodeBox,
  right: OntologyGraphNodeBox,
  gap: number,
): [OntologyGraphNodeBox, OntologyGraphNodeBox] {
  const dx = right.centerX - left.centerX || 1;
  const dy = right.centerY - left.centerY || 1;
  const distance = Math.hypot(dx, dy) || 1;
  const minDistance =
    (left.width + right.width) / 2 + gap / 2 + (left.height + right.height) / 4;
  const push = Math.max(0, minDistance - distance) / 2 + 0.5;
  const nx = (dx / distance) * push;
  const ny = (dy / distance) * push;
  return [
    { ...left, centerX: left.centerX - nx, centerY: left.centerY - ny },
    { ...right, centerX: right.centerX + nx, centerY: right.centerY + ny },
  ];
}

/** Spread overlapping mind-map nodes while keeping stems readable. */
export function separateOntologyGraphNodes(input: {
  nodes: readonly OntologyGraphNodeBox[];
  width?: number;
  minHeight?: number;
  gap?: number;
  maxWidth?: number;
}): SeparatedOntologyGraph {
  const gap = input.gap ?? DEFAULT_GAP_PX;
  const maxWidth = input.maxWidth ?? 360;
  let nodes = input.nodes.map((node) => ({ ...node }));

  if (nodes.length === 0) {
    return {
      nodes,
      width: input.width ?? 300,
      height: input.minHeight ?? 0,
      minY: 0,
    };
  }

  for (let pass = 0; pass < MAX_SEPARATION_PASSES; pass += 1) {
    let moved = false;
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i]!;
        const b = nodes[j]!;
        if (!boxesOverlap(a, b, gap)) {
          continue;
        }
        const [nextA, nextB] = pushPairApart(a, b, gap);
        nodes[i] = nextA;
        nodes[j] = nextB;
        moved = true;
      }
    }
    if (!moved) {
      break;
    }
  }

  const minX = Math.min(...nodes.map((node) => node.centerX - node.width / 2));
  const maxX = Math.max(...nodes.map((node) => node.centerX + node.width / 2));
  const minY = Math.min(...nodes.map((node) => node.centerY - node.height / 2));
  const maxY = Math.max(...nodes.map((node) => node.centerY + node.height / 2));

  const neededWidth = Math.ceil(maxX - minX + 24);
  const width = Math.min(maxWidth, Math.max(input.width ?? 300, neededWidth));
  const shiftX = width / 2 - (minX + maxX) / 2;
  if (Math.abs(shiftX) > 0.5) {
    nodes = nodes.map((node) => ({
      ...node,
      centerX: node.centerX + shiftX,
    }));
  }

  const height = Math.max(input.minHeight ?? 0, Math.ceil(maxY - minY + 20));

  return { nodes, width, height, minY };
}

export function mergeOntologyGraphNodeOffsets(
  base: OntologyGraphNodeBox,
  offset: { dx: number; dy: number } | null | undefined,
): OntologyGraphNodeBox {
  if (!offset) {
    return base;
  }
  return {
    ...base,
    centerX: base.centerX + offset.dx,
    centerY: base.centerY + offset.dy,
  };
}
