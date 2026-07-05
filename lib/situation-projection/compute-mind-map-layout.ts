import type {
  GhostProjectionNode,
  MindMapLayout,
  MindMapNodeLayout,
  SituationProjectionManifest,
} from "@/lib/situation-projection/types";
import { resolveProjectionNodeSemantic } from "@/lib/situation-projection/ontology-semantic";

export type { MindMapLayout, MindMapNodeLayout };

const NODE_W_ROOT = 184;
const NODE_H_ROOT = 76;
const NODE_W_SOLID = 148;
const NODE_H_SOLID = 64;
const NODE_W_GHOST = 136;
const NODE_H_GHOST = 72;

const AXIS_ROW_ORDER: readonly GhostProjectionNode["axisId"][] = [
  "lodging",
  "eatery",
  "place",
  "flight",
  "info",
  "ticket",
  "transit",
  "people",
  "records",
  "cost",
  "thread",
];

function axisRank(axisId: GhostProjectionNode["axisId"]): number {
  const index = AXIS_ROW_ORDER.indexOf(axisId);
  return index >= 0 ? index : AXIS_ROW_ORDER.length + 1;
}

function emphasisRank(emphasis: GhostProjectionNode["emphasis"]): number {
  if (emphasis === "focus") {
    return 0;
  }
  if (emphasis === "main") {
    return 1;
  }
  return 2;
}

function boxesOverlap(
  left: MindMapNodeLayout,
  right: MindMapNodeLayout,
  gap = 10,
): boolean {
  return !(
    left.x + left.width + gap <= right.x ||
    right.x + right.width + gap <= left.x ||
    left.y + left.height + gap <= right.y ||
    right.y + right.height + gap <= left.y
  );
}

function separateOverlappingNodes(nodes: MindMapNodeLayout[]): MindMapNodeLayout[] {
  const laidOut = nodes.map((node) => ({ ...node }));
  for (let pass = 0; pass < 16; pass += 1) {
    let moved = false;
    for (let i = 0; i < laidOut.length; i += 1) {
      for (let j = i + 1; j < laidOut.length; j += 1) {
        const a = laidOut[i]!;
        const b = laidOut[j]!;
        if (!boxesOverlap(a, b)) {
          continue;
        }
        const overlapX =
          Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const overlapY =
          Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        if (overlapX <= 0 || overlapY <= 0) {
          continue;
        }
        if (overlapX < overlapY) {
          const shift = Math.ceil((overlapX + 12) / 2);
          a.x -= shift;
          b.x += shift;
        } else {
          const shift = Math.ceil((overlapY + 12) / 2);
          a.y -= shift;
          b.y += shift;
        }
        moved = true;
      }
    }
    if (!moved) {
      break;
    }
  }
  return laidOut.map((node) => ({
    ...node,
    x: Math.max(8, node.x),
    y: Math.max(8, node.y),
  }));
}

/**
 * Deterministic ontology layout — root on top, ghosts grouped by axis rows.
 */
export function computeMindMapLayout(
  manifest: SituationProjectionManifest,
): MindMapLayout {
  const solids = manifest.nodes.filter((node) => node.kind === "solid");
  const ghosts = manifest.nodes
    .filter(
      (node): node is GhostProjectionNode =>
        node.kind === "ghost" && node.surfacePlacement !== "map_anchor",
    )
    .sort(
      (left, right) =>
        axisRank(left.axisId) - axisRank(right.axisId) ||
        emphasisRank(left.emphasis) - emphasisRank(right.emphasis) ||
        left.label.localeCompare(right.label, "ko"),
    );

  const anchor = solids[0];
  const secondarySolids = anchor ? solids.slice(1) : solids;
  const width = 392;
  const centerX = width / 2;
  const nodes: MindMapNodeLayout[] = [];

  if (anchor) {
    const anchorSemantic = resolveProjectionNodeSemantic(anchor);
    const anchorWidth =
      anchorSemantic.ontologyRole === "root" ? NODE_W_ROOT : NODE_W_SOLID;
    const anchorHeight =
      anchorSemantic.ontologyRole === "root" ? NODE_H_ROOT : NODE_H_SOLID;
    nodes.push({
      id: anchor.id,
      x: centerX - anchorWidth / 2,
      y: 14,
      width: anchorWidth,
      height: anchorHeight,
    });
  }

  const secondaryCols =
    secondarySolids.length <= 2 ? secondarySolids.length || 1 : secondarySolids.length <= 4 ? 2 : 3;
  const secondaryGapX = NODE_W_SOLID + 20;
  const secondaryRowWidth = Math.max(0, (secondaryCols - 1) * secondaryGapX);
  const secondaryY = anchor ? 108 : 20;

  secondarySolids.forEach((solid, index) => {
    const col = index % secondaryCols;
    const row = Math.floor(index / secondaryCols);
    nodes.push({
      id: solid.id,
      x: centerX - secondaryRowWidth / 2 + col * secondaryGapX - NODE_W_SOLID / 2,
      y: secondaryY + row * (NODE_H_SOLID + 16),
      width: NODE_W_SOLID,
      height: NODE_H_SOLID,
    });
  });

  const solidRows =
    secondarySolids.length > 0 ? Math.ceil(secondarySolids.length / secondaryCols) : 0;
  let cursorY = anchor
    ? secondarySolids.length > 0
      ? secondaryY + solidRows * (NODE_H_SOLID + 16) + 36
      : 112
    : secondarySolids.length > 0
      ? secondaryY + solidRows * (NODE_H_SOLID + 16) + 30
      : 28;

  const ghostsByAxis = new Map<GhostProjectionNode["axisId"], GhostProjectionNode[]>();
  for (const ghost of ghosts) {
    const bucket = ghostsByAxis.get(ghost.axisId) ?? [];
    bucket.push(ghost);
    ghostsByAxis.set(ghost.axisId, bucket);
  }

  const axisIds = [...ghostsByAxis.keys()].sort(
    (left, right) => axisRank(left) - axisRank(right),
  );

  for (const axisId of axisIds) {
    const axisGhosts = ghostsByAxis.get(axisId) ?? [];
    if (axisGhosts.length === 0) {
      continue;
    }
    const cols = axisGhosts.length <= 2 ? axisGhosts.length : axisGhosts.length <= 4 ? 2 : 3;
    const gapX = NODE_W_GHOST + 20;
    const gapY = NODE_H_GHOST + 18;
    const rowWidth = Math.max(0, (cols - 1) * gapX);

    axisGhosts.forEach((ghost, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      nodes.push({
        id: ghost.id,
        x: centerX - rowWidth / 2 + col * gapX - NODE_W_GHOST / 2,
        y: cursorY + row * gapY,
        width: NODE_W_GHOST,
        height: NODE_H_GHOST,
      });
    });

    const axisRows = Math.ceil(axisGhosts.length / cols);
    cursorY += axisRows * gapY + 12;
  }

  const separated = separateOverlappingNodes(nodes);
  const height = Math.max(
    260,
    separated.reduce((max, node) => Math.max(max, node.y + node.height + 24), 0),
  );

  return { width, height, nodes: separated };
}

/** Center point for drawing links between nodes. */
export function mindMapNodeCenter(layout: MindMapNodeLayout): { x: number; y: number } {
  return {
    x: layout.x + layout.width / 2,
    y: layout.y + layout.height / 2,
  };
}
