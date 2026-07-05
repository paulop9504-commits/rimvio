/** Screen/callout pill footprint — used for non-overlap layout. */
export const CALLOUT_PILL_WIDTH_PX = 152;
export const CALLOUT_PILL_HEIGHT_PX = 80;
export const CALLOUT_PILL_GAP_PX = 14;

export type CalloutOffset = {
  x: number;
  y: number;
};

const COMPASS_ANGLES_RAD = [
  -Math.PI / 2,
  -Math.PI / 4,
  0,
  Math.PI / 4,
  Math.PI / 2,
  (3 * Math.PI) / 4,
  Math.PI,
  (-3 * Math.PI) / 4,
] as const;

function buildCompassCandidates(total: number): CalloutOffset[] {
  const candidates: CalloutOffset[] = [];
  let ring = 0;
  while (candidates.length < total) {
    const radius = 92 + ring * 68;
    const slots =
      ring === 0
        ? COMPASS_ANGLES_RAD.length
        : COMPASS_ANGLES_RAD.length + ring * 3;
    for (let slot = 0; slot < slots && candidates.length < total; slot += 1) {
      const angle =
        ring === 0
          ? COMPASS_ANGLES_RAD[slot % COMPASS_ANGLES_RAD.length]!
          : (slot / slots) * Math.PI * 2 - Math.PI / 2;
      candidates.push({
        x: Math.round(Math.cos(angle) * radius),
        y: Math.round(Math.sin(angle) * radius),
      });
    }
    ring += 1;
  }
  return candidates.slice(0, total);
}

function pillBoxesOverlap(left: CalloutOffset, right: CalloutOffset): boolean {
  const halfW = CALLOUT_PILL_WIDTH_PX / 2 + CALLOUT_PILL_GAP_PX / 2;
  const halfH = CALLOUT_PILL_HEIGHT_PX / 2 + CALLOUT_PILL_GAP_PX / 2;
  return (
    Math.abs(left.x - right.x) < halfW * 2 &&
    Math.abs(left.y - right.y) < halfH * 2
  );
}

/** Nudge overlapping compass slots apart while keeping stems readable. */
export function resolveNonOverlappingCalloutOffsets(total: number): CalloutOffset[] {
  if (total <= 0) {
    return [];
  }
  if (total === 1) {
    return [{ x: 0, y: -84 }];
  }

  const offsets = buildCompassCandidates(total);
  const maxPasses = 12;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    let moved = false;
    for (let i = 0; i < offsets.length; i += 1) {
      for (let j = i + 1; j < offsets.length; j += 1) {
        const a = offsets[i]!;
        const b = offsets[j]!;
        if (!pillBoxesOverlap(a, b)) {
          continue;
        }
        const dx = b.x - a.x || (j - i);
        const dy = b.y - a.y || 1;
        const distance = Math.hypot(dx, dy) || 1;
        const push = (CALLOUT_PILL_WIDTH_PX + CALLOUT_PILL_GAP_PX) / 2;
        const nx = (dx / distance) * push;
        const ny = (dy / distance) * push;
        offsets[i] = {
          x: Math.round(a.x - nx),
          y: Math.round(a.y - ny),
        };
        offsets[j] = {
          x: Math.round(b.x + nx),
          y: Math.round(b.y + ny),
        };
        moved = true;
      }
    }
    if (!moved) {
      break;
    }
  }
  return offsets;
}

export function resolveNonOverlappingCalloutOffset(
  index: number,
  total: number,
): CalloutOffset {
  return resolveNonOverlappingCalloutOffsets(total)[index] ?? { x: 0, y: -84 };
}

export type ScreenAnchoredNodeBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number;
};

/** Spread map-overlay ontology cards that share the same screen anchor. */
export function layoutScreenAnchoredNodeOffsets(
  nodes: readonly ScreenAnchoredNodeBox[],
): Record<string, { dx: number; dy: number }> {
  if (nodes.length <= 1) {
    return Object.fromEntries(nodes.map((node) => [node.id, { dx: 0, dy: 0 }]));
  }

  const sorted = [...nodes].sort(
    (left, right) => right.priority - left.priority || left.id.localeCompare(right.id),
  );
  const placed: Array<ScreenAnchoredNodeBox & { dx: number; dy: number }> = [];
  const result: Record<string, { dx: number; dy: number }> = {};

  for (const node of sorted) {
    let dx = 0;
    let dy = 0;
    let attempts = 0;
    const stepY = node.height + 12;
    const stepX = node.width + 14;

    while (attempts < 24) {
      const overlaps = placed.some((other) => {
        const ax1 = node.x + dx - node.width / 2;
        const ax2 = node.x + dx + node.width / 2;
        const ay1 = node.y + dy - node.height;
        const ay2 = node.y + dy;
        const bx1 = other.x + other.dx - other.width / 2;
        const bx2 = other.x + other.dx + other.width / 2;
        const by1 = other.y + other.dy - other.height;
        const by2 = other.y + other.dy;
        return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
      });
      if (!overlaps) {
        break;
      }
      attempts += 1;
      const ring = Math.floor(attempts / 4);
      const slot = attempts % 4;
      if (slot === 0) {
        dy -= stepY + ring * 8;
      } else if (slot === 1) {
        dx += stepX;
        dy -= stepY * 0.35;
      } else if (slot === 2) {
        dx -= stepX;
        dy -= stepY * 0.35;
      } else {
        dy -= stepY * 1.35 + ring * 10;
        dx = ring % 2 === 0 ? stepX * 0.55 : -stepX * 0.55;
      }
    }

    result[node.id] = { dx, dy };
    placed.push({ ...node, dx, dy });
  }

  return result;
}
