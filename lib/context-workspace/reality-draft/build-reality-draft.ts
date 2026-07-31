/**
 * Reality Draft SSOT — day-structured Action-Ready graph shared by Chat + Map.
 * Prepared State only — not Reality Commit.
 */

import type {
  ActionReadyState,
  ContextWorkspaceNode,
  ContextWorkspaceNodeKind,
} from "@/lib/context-workspace/types";

export type RealityDraftEntityKind =
  | "airport"
  | "hotel"
  | "attraction"
  | "place"
  | "food"
  | "other";

export type RealityDraftNodeRef = {
  readonly nodeId: string;
  readonly placeId: string;
  readonly title: string;
  readonly entityKind: RealityDraftEntityKind;
  readonly lat: number;
  readonly lng: number;
  readonly actionReadyState: ActionReadyState;
  readonly actions: readonly string[];
  readonly emoji: string;
};

export type RealityDraftDay = {
  readonly day: number;
  readonly labelKo: string;
  readonly emoji: string;
  readonly nodes: readonly RealityDraftNodeRef[];
  /** Chat line: titles joined with → */
  readonly lineKo: string;
};

export type RealityDraft = {
  readonly draftId: string;
  readonly contextTitleKo: string;
  readonly destinationKo: string | null;
  readonly stayLabelKo: string | null;
  readonly status: "prepared";
  readonly days: readonly RealityDraftDay[];
  readonly nodeIds: readonly string[];
  readonly updatedAtIso: string;
};

function entityKindFromNode(node: ContextWorkspaceNode): RealityDraftEntityKind {
  if (/공항|airport|kix/iu.test(`${node.title} ${node.tags.join(" ")}`)) {
    return "airport";
  }
  if (node.kind === "lodging") return "hotel";
  if (node.kind === "eatery" || node.tags.includes("food")) return "food";
  if (/usj|유니버설|theme/iu.test(`${node.title} ${node.tags.join(" ")}`)) {
    return "attraction";
  }
  if (node.kind === "poi" || node.kind === "amenity") return "place";
  return "other";
}

function emojiFor(kind: RealityDraftEntityKind): string {
  switch (kind) {
    case "airport":
      return "✈️";
    case "hotel":
      return "🏨";
    case "attraction":
      return "🎢";
    case "food":
      return "🍣";
    case "place":
      return "📍";
    default:
      return "📌";
  }
}

function actionsFor(
  kind: RealityDraftEntityKind,
  nodeKind: ContextWorkspaceNodeKind,
): readonly string[] {
  if (kind === "airport") return ["flight", "route"];
  if (kind === "hotel" || nodeKind === "lodging") return ["booking", "compare"];
  if (kind === "attraction") return ["ticket", "schedule_add"];
  if (kind === "food" || nodeKind === "eatery") return ["reserve", "save"];
  return ["navigate", "save"];
}

function toRef(node: ContextWorkspaceNode): RealityDraftNodeRef {
  const entityKind = entityKindFromNode(node);
  return {
    nodeId: node.id,
    placeId: node.placeId,
    title: node.title,
    entityKind,
    lat: node.lat,
    lng: node.lng,
    actionReadyState: node.actionReadyState ?? "prepare",
    actions: actionsFor(entityKind, node.kind),
    emoji: emojiFor(entityKind),
  };
}

/**
 * Prefer tagged day buckets for Osaka Reality Draft; else chunk by 3.
 */
function partitionDays(
  nodes: readonly ContextWorkspaceNode[],
): RealityDraftDay[] {
  const visible = nodes.filter((n) => n.visible);
  if (visible.length === 0) return [];

  const byHint = new Map<number, ContextWorkspaceNode[]>();
  const unassigned: ContextWorkspaceNode[] = [];

  for (const node of visible) {
    const dayTag = node.tags.find((t) => /^day[_-]?(\d+)$/iu.test(t));
    if (dayTag) {
      const n = Number(/(\d+)/u.exec(dayTag)?.[1] ?? 0);
      if (n > 0) {
        const list = byHint.get(n) ?? [];
        list.push(node);
        byHint.set(n, list);
        continue;
      }
    }
    // Heuristic roles for Osaka draft order
    if (/airport|kix|arrival/iu.test(node.tags.join(" ")) || /공항/u.test(node.title)) {
      const list = byHint.get(1) ?? [];
      list.push(node);
      byHint.set(1, list);
      continue;
    }
    if (node.kind === "lodging" || node.tags.includes("stay")) {
      const list = byHint.get(1) ?? [];
      list.push(node);
      byHint.set(1, list);
      continue;
    }
    if (/usj|experience|theme/iu.test(node.tags.join(" ")) || /유니버설/u.test(node.title)) {
      const list = byHint.get(3) ?? [];
      list.push(node);
      byHint.set(3, list);
      continue;
    }
    if (/food_area|photo_spot|landmark/iu.test(node.tags.join(" ")) && byHint.has(1)) {
      const list = byHint.get(1) ?? [];
      // keep day1 evening places with arrival
      if (list.length < 4) {
        list.push(node);
        byHint.set(1, list);
        continue;
      }
    }
    unassigned.push(node);
  }

  // Fill day 2 with remaining
  if (unassigned.length > 0) {
    const d2 = byHint.get(2) ?? [];
    d2.push(...unassigned);
    byHint.set(2, d2);
  }

  if (byHint.size === 0) {
    const chunk = 3;
    const days: RealityDraftDay[] = [];
    for (let i = 0; i < visible.length; i += chunk) {
      const slice = visible.slice(i, i + chunk);
      const day = Math.floor(i / chunk) + 1;
      days.push(buildDay(day, slice.map(toRef)));
    }
    return days;
  }

  return [...byHint.keys()]
    .sort((a, b) => a - b)
    .map((day) => buildDay(day, (byHint.get(day) ?? []).map(toRef)));
}

function dayEmoji(day: number, nodes: readonly RealityDraftNodeRef[]): string {
  if (nodes.some((n) => n.entityKind === "attraction")) return "🎢";
  if (nodes.some((n) => n.entityKind === "airport")) return "✈️";
  if (day === 2) return "🏯";
  return "📍";
}

function buildDay(
  day: number,
  nodes: readonly RealityDraftNodeRef[],
): RealityDraftDay {
  return {
    day,
    labelKo: `DAY ${day}`,
    emoji: dayEmoji(day, nodes),
    nodes,
    lineKo: nodes.map((n) => n.title).join(" → "),
  };
}

export function buildRealityDraft(input: {
  readonly contextTitleKo: string;
  readonly destinationKo?: string | null;
  readonly stayLabelKo?: string | null;
  readonly nodes: readonly ContextWorkspaceNode[];
}): RealityDraft | null {
  const days = partitionDays(input.nodes);
  if (days.length === 0) return null;
  const nodeIds = days.flatMap((d) => d.nodes.map((n) => n.nodeId));
  return {
    draftId: `rdraft:${Date.now().toString(36)}`,
    contextTitleKo: input.contextTitleKo.trim() || "여행",
    destinationKo: input.destinationKo?.trim() || null,
    stayLabelKo: input.stayLabelKo?.trim() || null,
    status: "prepared",
    days,
    nodeIds,
    updatedAtIso: new Date().toISOString(),
  };
}

export function findRealityDraftDayForNode(
  draft: RealityDraft,
  nodeId: string,
): RealityDraftDay | null {
  return draft.days.find((d) => d.nodes.some((n) => n.nodeId === nodeId)) ?? null;
}

export function findRealityDraftNode(
  draft: RealityDraft,
  nodeId: string,
): RealityDraftNodeRef | null {
  for (const day of draft.days) {
    const hit = day.nodes.find((n) => n.nodeId === nodeId);
    if (hit) return hit;
  }
  return null;
}
