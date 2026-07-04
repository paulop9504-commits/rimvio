import type {
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
const NODE_W_GHOST = 132;
const NODE_H_GHOST = 68;

/**
 * Deterministic star layout — anchor solid at top center, ghosts in rows below.
 * Coordinates are pixel positions inside the layout viewport.
 */
export function computeMindMapLayout(
  manifest: SituationProjectionManifest,
): MindMapLayout {
  const solids = manifest.nodes.filter((n) => n.kind === "solid");
  const ghosts = manifest.nodes.filter(
    (n) => n.kind === "ghost" && n.surfacePlacement !== "map_anchor",
  );
  const anchor = solids[0];
  const secondarySolids = anchor ? solids.slice(1) : solids;

  const width = 392;
  const centerX = width / 2;
  const nodes: MindMapNodeLayout[] = [];

  if (anchor) {
    const anchorSemantic = resolveProjectionNodeSemantic(anchor);
    const anchorWidth = anchorSemantic.ontologyRole === "root" ? NODE_W_ROOT : NODE_W_SOLID;
    const anchorHeight = anchorSemantic.ontologyRole === "root" ? NODE_H_ROOT : NODE_H_SOLID;
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
  const secondaryGapX = NODE_W_SOLID + 18;
  const secondaryRowWidth = Math.max(0, (secondaryCols - 1) * secondaryGapX);
  const secondaryY = anchor ? 108 : 20;

  secondarySolids.forEach((solid, index) => {
    const col = index % secondaryCols;
    const row = Math.floor(index / secondaryCols);
    nodes.push({
      id: solid.id,
      x: centerX - secondaryRowWidth / 2 + col * secondaryGapX - NODE_W_SOLID / 2,
      y: secondaryY + row * (NODE_H_SOLID + 14),
      width: NODE_W_SOLID,
      height: NODE_H_SOLID,
    });
  });

  const cols = ghosts.length <= 2 ? ghosts.length || 1 : ghosts.length <= 4 ? 2 : 3;
  const gapX = NODE_W_GHOST + 18;
  const gapY = NODE_H_GHOST + 16;
  const solidRows = secondarySolids.length > 0 ? Math.ceil(secondarySolids.length / secondaryCols) : 0;
  const startY = anchor
    ? secondarySolids.length > 0
      ? secondaryY + solidRows * (NODE_H_SOLID + 14) + 34
      : 110
    : secondarySolids.length > 0
      ? secondaryY + solidRows * (NODE_H_SOLID + 14) + 28
      : 28;
  const rowWidth = Math.max(0, (cols - 1) * gapX);

  ghosts.forEach((ghost, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = centerX - rowWidth / 2 + col * gapX - NODE_W_GHOST / 2;
    const y = startY + row * gapY;
    nodes.push({
      id: ghost.id,
      x,
      y,
      width: NODE_W_GHOST,
      height: NODE_H_GHOST,
    });
  });

  const lastRow = ghosts.length > 0 ? Math.floor((ghosts.length - 1) / cols) : 0;
  const height = Math.max(
    260,
    startY + lastRow * gapY + NODE_H_GHOST + 24,
  );

  return { width, height, nodes };
}

/** Center point for drawing links between nodes. */
export function mindMapNodeCenter(layout: MindMapNodeLayout): { x: number; y: number } {
  return {
    x: layout.x + layout.width / 2,
    y: layout.y + layout.height / 2,
  };
}
