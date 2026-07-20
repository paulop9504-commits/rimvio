/**
 * Context Builder — Cursor-style relevant pack for Reality Graph.
 * Never dump the whole session graph into LLM / Agent.
 *
 * @see docs/adr/013-cursor-rimvio-isomorphism.md
 */

import type { IntentFamily } from "@/lib/rule-engine/constitution";
import { classifyIntentFamily } from "@/lib/rule-engine/classify-intent-family";
import type {
  GraphFilterPredicate,
  SessionGraphEdge,
  SessionGraphNode,
  SessionGraphV1,
} from "@/lib/graph-command/types";

export const CONTEXT_PACK_VERSION = 1 as const;

/** Compact node card — analogous to a file path + snippet in Cursor. */
export type ContextPackNode = {
  readonly id: string;
  readonly labelKo: string;
  readonly kind: SessionGraphNode["kind"];
  readonly pinned: boolean;
  readonly selected: boolean;
  readonly visible: boolean;
  readonly reservable: boolean;
  readonly localFavorite: boolean;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly whyIncludedKo: string;
};

export type ContextPackLodgingDiff = {
  readonly selectedLodgingId: string | null;
  readonly selectedLodgingLabelKo: string | null;
  /** Alias — selected / pinned lodging node (open project pin). */
  readonly selectedPinId: string | null;
  readonly checkInIso: string | null;
  readonly checkOutIso: string | null;
  readonly nights: number | null;
  readonly guestCount: number | null;
  readonly roomCount: number | null;
  /** Open scout / tool-search Diff batch — same project continuity. */
  readonly lastBatchId: string | null;
  /** lastBatch recommendation placeIds — open project map focus. */
  readonly lastBatchPlaceIds: readonly string[];
  readonly maxNightlyPriceKrw: number | null;
};

export type ContextPackV1 = {
  readonly version: typeof CONTEXT_PACK_VERSION;
  readonly contextEventId: string;
  readonly utterance: string;
  readonly intent: IntentFamily;
  /** Cursor “open / selected files” analog. */
  readonly selectionIds: readonly string[];
  readonly projectFolders: readonly string[];
  readonly activeFilters: GraphFilterPredicate;
  readonly anchorLat: number | null;
  readonly anchorLng: number | null;
  /** Relevant nodes only — capped. */
  readonly nodes: readonly ContextPackNode[];
  readonly edgeCount: number;
  readonly relevantEdgeIds: readonly string[];
  /**
   * Forced lodging Diff — selected stay · guests · lastBatch.
   * Carried every turn so 「더 싸게」「하루 늘려」 hit the same project.
   */
  readonly lodgingDiff: ContextPackLodgingDiff | null;
  /** Stats for telemetry / debug — not full dump. */
  readonly stats: {
    readonly graphNodeTotal: number;
    readonly packedNodeCount: number;
    readonly truncated: boolean;
  };
  readonly builtAtIso: string;
};

const DEFAULT_CAP = 12;

function whyFor(
  node: SessionGraphNode,
  selected: boolean,
  intent: IntentFamily,
  discoveryPlaceIds?: ReadonlySet<string>,
): string {
  if (selected) {
    return "선택됨";
  }
  if (node.pinned) {
    return "고정";
  }
  if (discoveryPlaceIds?.has(node.id)) {
    return "최근 스카우트";
  }
  const catalogId =
    typeof node.attrs?.catalogId === "string" ? node.attrs.catalogId : "";
  const searchId =
    typeof node.attrs?.searchId === "string" ? node.attrs.searchId : "";
  if (
    discoveryPlaceIds &&
    (discoveryPlaceIds.has(catalogId) || discoveryPlaceIds.has(searchId))
  ) {
    return "지도 포커스";
  }
  if (intent === "Reserve" && node.reservable) {
    return "예약 가능";
  }
  if (intent === "Filter" || intent === "Search") {
    if (node.localFavorite) {
      return "현지 시그널";
    }
    if (node.visible) {
      return "검색 결과";
    }
  }
  if (intent === "Compare" && node.kind === "compare") {
    return "비교";
  }
  if (node.kind === "lodging" || node.kind === "eatery") {
    return "장소";
  }
  return "관련";
}

function scoreNode(
  node: SessionGraphNode,
  input: {
    selected: Set<string>;
    intent: IntentFamily;
    utterance: string;
    discoveryPlaceIds?: ReadonlySet<string>;
  },
): number {
  let score = 0;
  if (input.selected.has(node.id)) {
    score += 100;
  }
  if (node.pinned) {
    score += 40;
  }
  const catalogId =
    typeof node.attrs?.catalogId === "string" ? node.attrs.catalogId : "";
  const searchId =
    typeof node.attrs?.searchId === "string" ? node.attrs.searchId : "";
  if (
    input.discoveryPlaceIds?.has(node.id) ||
    (catalogId && input.discoveryPlaceIds?.has(catalogId)) ||
    (searchId && input.discoveryPlaceIds?.has(searchId))
  ) {
    score += 70;
  }
  if (node.alwaysVisible) {
    score += 15;
  }
  if (!node.visible && node.kind !== "compare" && node.kind !== "note") {
    score -= 20;
  }

  const ut = input.utterance;
  if (node.labelKo && ut.includes(node.labelKo)) {
    score += 50;
  }
  if (/apa|아파/iu.test(ut) && /apa|아파/iu.test(node.labelKo)) {
    score += 30;
  }

  switch (input.intent) {
    case "Reserve":
    case "Purchase":
      if (node.reservable) {
        score += 25;
      }
      if (node.kind === "lodging" || node.kind === "eatery") {
        score += 10;
      }
      break;
    case "Search":
    case "Filter":
      if (node.visible && (node.kind === "eatery" || node.kind === "lodging")) {
        score += 20;
      }
      if (node.localFavorite) {
        score += 12;
      }
      break;
    case "Compare":
      if (node.kind === "compare") {
        score += 40;
      }
      break;
    case "Pin":
      if (node.kind === "lodging" || /호텔|숙소/iu.test(node.labelKo)) {
        score += 15;
      }
      break;
    case "Delete":
    case "Move":
    case "Share":
      if (input.selected.has(node.id) || node.pinned) {
        score += 20;
      }
      break;
    default:
      break;
  }

  return score;
}

function toPackNode(
  node: SessionGraphNode,
  selected: Set<string>,
  intent: IntentFamily,
  discoveryPlaceIds?: ReadonlySet<string>,
): ContextPackNode {
  const isSelected = selected.has(node.id);
  return {
    id: node.id,
    labelKo: node.labelKo,
    kind: node.kind,
    pinned: node.pinned,
    selected: isSelected,
    visible: node.visible,
    reservable: node.reservable,
    localFavorite: node.localFavorite,
    lat: node.lat,
    lng: node.lng,
    whyIncludedKo: whyFor(node, isSelected, intent, discoveryPlaceIds),
  };
}

function relatedEdges(
  edges: readonly SessionGraphEdge[],
  nodeIds: ReadonlySet<string>,
): readonly string[] {
  return edges
    .filter((e) => nodeIds.has(e.fromId) || nodeIds.has(e.toId))
    .map((e) => e.id)
    .slice(0, 24);
}

/**
 * Build a Cursor-style context pack from the session graph.
 * Caps size — never serializes the full graph for LLM.
 */
export function buildContextPack(input: {
  readonly utterance: string;
  readonly graph: SessionGraphV1 | null;
  readonly intent?: IntentFamily;
  readonly maxNodes?: number;
  /** Active scout / map focus place ids — Cursor “open files”. */
  readonly discoveryPlaceIds?: readonly string[];
  /** Forced lodging Diff from slots / selection / lastBatch / previous pack. */
  readonly lodgingDiff?: ContextPackLodgingDiff | null;
}): ContextPackV1 {
  const utterance = input.utterance.trim();
  const intent = input.intent ?? classifyIntentFamily(utterance);
  const cap = input.maxNodes ?? DEFAULT_CAP;
  const graph = input.graph;
  const lodgingDiff = input.lodgingDiff ?? null;
  const discoveryPlaceIds = new Set(
    (input.discoveryPlaceIds ?? []).map((id) => id.trim()).filter(Boolean),
  );
  const empty: ContextPackV1 = {
    version: CONTEXT_PACK_VERSION,
    contextEventId: graph?.contextEventId ?? "",
    utterance,
    intent,
    selectionIds: [],
    projectFolders: [],
    activeFilters: {},
    anchorLat: null,
    anchorLng: null,
    nodes: [],
    edgeCount: 0,
    relevantEdgeIds: [],
    lodgingDiff,
    stats: {
      graphNodeTotal: 0,
      packedNodeCount: 0,
      truncated: false,
    },
    builtAtIso: new Date().toISOString(),
  };

  if (!graph) {
    return empty;
  }

  const selected = new Set(graph.selectionIds);
  const ranked = [...graph.nodes]
    .map((node) => ({
      node,
      score: scoreNode(node, {
        selected,
        intent,
        utterance,
        discoveryPlaceIds,
      }),
    }))
    .filter(
      (row) =>
        row.score > 0 ||
        selected.has(row.node.id) ||
        row.node.pinned ||
        discoveryPlaceIds.has(row.node.id),
    )
    .sort((a, b) => b.score - a.score);

  // Always keep selection + pinned + discovery even if score filter was tight
  const byId = new Map<string, SessionGraphNode>();
  for (const id of graph.selectionIds) {
    const n = graph.nodes.find((x) => x.id === id);
    if (n) {
      byId.set(n.id, n);
    }
  }
  for (const n of graph.nodes) {
    if (n.pinned) {
      byId.set(n.id, n);
    }
  }
  for (const n of graph.nodes) {
    const catalogId =
      typeof n.attrs?.catalogId === "string" ? n.attrs.catalogId : "";
    const searchId =
      typeof n.attrs?.searchId === "string" ? n.attrs.searchId : "";
    if (
      discoveryPlaceIds.has(n.id) ||
      (catalogId && discoveryPlaceIds.has(catalogId)) ||
      (searchId && discoveryPlaceIds.has(searchId))
    ) {
      byId.set(n.id, n);
    }
  }
  for (const row of ranked) {
    if (byId.size >= cap) {
      break;
    }
    byId.set(row.node.id, row.node);
  }

  const packedNodes = [...byId.values()].slice(0, cap);
  const idSet = new Set(packedNodes.map((n) => n.id));
  const edgeIds = relatedEdges(graph.edges, idSet);

  return {
    version: CONTEXT_PACK_VERSION,
    contextEventId: graph.contextEventId,
    utterance,
    intent,
    selectionIds: graph.selectionIds,
    projectFolders: graph.projectFolders,
    activeFilters: graph.activeFilters,
    anchorLat: graph.anchorLat,
    anchorLng: graph.anchorLng,
    nodes: packedNodes.map((n) =>
      toPackNode(n, selected, intent, discoveryPlaceIds),
    ),
    edgeCount: graph.edges.length,
    relevantEdgeIds: edgeIds,
    lodgingDiff,
    stats: {
      graphNodeTotal: graph.nodes.length,
      packedNodeCount: packedNodes.length,
      truncated: graph.nodes.length > packedNodes.length,
    },
    builtAtIso: new Date().toISOString(),
  };
}

/** One-line L1 hint for chat / debug — not an inventory dump. */
export function formatContextPackHintKo(pack: ContextPackV1): string {
  if (pack.nodes.length === 0 && !pack.lodgingDiff) {
    return "지금 열린 맥락이 비어 있어요";
  }
  const labels = pack.nodes
    .slice(0, 3)
    .map((n) => n.labelKo)
    .join(" · ");
  const more =
    pack.stats.packedNodeCount > 3
      ? ` 외 ${pack.stats.packedNodeCount - 3}곳`
      : "";
  const stay =
    pack.lodgingDiff?.nights != null
      ? ` · ${pack.lodgingDiff.nights}박`
      : "";
  const guests =
    pack.lodgingDiff?.guestCount != null
      ? ` · ${pack.lodgingDiff.guestCount}명`
      : "";
  if (!labels) {
    const lodging = pack.lodgingDiff?.selectedLodgingLabelKo?.trim();
    return lodging
      ? `맥락 ${lodging}${stay}${guests}`
      : `맥락 일정${stay}${guests}`.trim();
  }
  return `맥락 ${labels}${more}${stay}${guests}`;
}
