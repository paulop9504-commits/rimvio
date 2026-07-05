import { separateOntologyGraphNodes } from "@/lib/globe/separate-ontology-graph-nodes";

export type MapAnchorDragBox = {
  id: string;
  anchorX: number;
  anchorY: number;
  autoDx: number;
  autoDy: number;
  userDx: number;
  userDy: number;
  width: number;
  height: number;
};

/** After manual drag, spread map-anchored cards so they stay readable. */
export function nudgeMapAnchorDragOffsets(
  boxes: readonly MapAnchorDragBox[],
): Record<string, { dx: number; dy: number }> {
  if (boxes.length <= 1) {
    return Object.fromEntries(
      boxes.map((box) => [box.id, { dx: box.userDx, dy: box.userDy }]),
    );
  }

  const merged = boxes.map((box) => ({
    id: box.id,
    centerX: box.anchorX + box.autoDx + box.userDx,
    centerY: box.anchorY - 8 + box.autoDy + box.userDy - box.height / 2,
    width: box.width,
    height: box.height,
  }));

  const separated = separateOntologyGraphNodes({
    nodes: merged,
    width: 420,
    maxWidth: 480,
    gap: 12,
  });

  const result: Record<string, { dx: number; dy: number }> = {};
  for (const node of separated.nodes) {
    const box = boxes.find((row) => row.id === node.id);
    if (!box) {
      continue;
    }
    result[node.id] = {
      dx: node.centerX - box.anchorX - box.autoDx,
      dy: node.centerY + box.height / 2 - (box.anchorY - 8) - box.autoDy,
    };
  }
  return result;
}

export function resolveMapAnchorDragOffset(
  auto: { dx: number; dy: number },
  user: { dx: number; dy: number } | null | undefined,
): { dx: number; dy: number } {
  return {
    dx: auto.dx + (user?.dx ?? 0),
    dy: auto.dy + (user?.dy ?? 0),
  };
}
