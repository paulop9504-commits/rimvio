/**
 * Selection / deictic / ordinal SSOT for Graph + soft Navigate.
 * Resolve before label scoring — 「그거」「두 번째」 never go through substring match alone.
 */

import type {
  GraphEntityRef,
  SessionGraphNode,
  SessionGraphV1,
} from "@/lib/graph-command/types";

const DEICTIC =
  /^(?:그거|이거|저거|그것|이것|저것|여기|이쪽|저기|해당|이\s*곳|이\s*거)$/iu;

const ORDINAL_WORD: ReadonlyArray<{ readonly re: RegExp; readonly index: number }> = [
  { re: /첫\s*(?:번\s*)?째|첫번째|1\s*번(?:째)?|first/iu, index: 0 },
  { re: /두\s*(?:번\s*)?째|두번째|2\s*번(?:째)?|second/iu, index: 1 },
  { re: /세\s*(?:번\s*)?째|세번째|3\s*번(?:째)?|third/iu, index: 2 },
  { re: /네\s*(?:번\s*)?째|네번째|4\s*번(?:째)?|fourth/iu, index: 3 },
  { re: /다섯\s*(?:번\s*)?째|다섯번째|5\s*번(?:째)?|fifth/iu, index: 4 },
];

export function isDeicticTargetLabel(label: string): boolean {
  return DEICTIC.test(label.trim());
}

/** Visible place-like nodes in Diff order (selection-biased). */
export function listVisiblePlaceNodes(
  graph: SessionGraphV1 | null,
): SessionGraphNode[] {
  if (!graph) {
    return [];
  }
  const places = graph.nodes.filter(
    (n) =>
      n.visible &&
      (n.kind === "lodging" || n.kind === "eatery" || n.kind === "poi"),
  );
  if (graph.selectionIds.length === 0) {
    return places;
  }
  const selected = new Set(graph.selectionIds);
  return [
    ...places.filter((n) => selected.has(n.id)),
    ...places.filter((n) => !selected.has(n.id)),
  ];
}

/**
 * 0-based ordinal from utterance, or null if none.
 */
export function parseOrdinalIndex(utterance: string): number | null {
  const text = utterance.trim();
  if (!text) {
    return null;
  }
  for (const row of ORDINAL_WORD) {
    if (row.re.test(text)) {
      return row.index;
    }
  }
  const numbered = text.match(/(\d{1,2})\s*(?:번(?:째)?|번째)/u);
  if (numbered?.[1]) {
    const n = Number(numbered[1]);
    if (n >= 1 && n <= 20) {
      return n - 1;
    }
  }
  return null;
}

export function selectionRefFromGraph(
  graph: SessionGraphV1 | null,
): GraphEntityRef | null {
  const id = graph?.selectionIds[0];
  if (!id || !graph) {
    return null;
  }
  const node = graph.nodes.find((n) => n.id === id);
  if (!node) {
    return null;
  }
  return { labelKo: node.labelKo, nodeId: node.id };
}

export function ordinalRefFromGraph(
  graph: SessionGraphV1 | null,
  index: number,
): GraphEntityRef | null {
  const places = listVisiblePlaceNodes(graph);
  const node = places[index];
  if (!node) {
    return null;
  }
  return { labelKo: node.labelKo, nodeId: node.id };
}

/**
 * Resolve 그거/N번째/selection for Pin·Reserve·Delete·Navigate·Share·Payment.
 * Named labels (non-deictic) are NOT resolved here — callers use entity score.
 */
export function resolveSelectionOrOrdinalRef(
  graph: SessionGraphV1 | null,
  utterance: string,
): GraphEntityRef | null {
  const text = utterance.trim();
  if (!text || !graph) {
    return null;
  }

  const ordinal = parseOrdinalIndex(text);
  if (ordinal != null) {
    const fromOrdinal = ordinalRefFromGraph(graph, ordinal);
    if (fromOrdinal) {
      return fromOrdinal;
    }
  }

  if (
    isDeicticTargetLabel(text) ||
    /(?:그거|이거|저거|그것|이것|저것|여기|이쪽|저기|해당)(?:\s|$|을|를|이|가|은|는|로|으로)/iu.test(
      text,
    )
  ) {
    return (
      selectionRefFromGraph(graph) ??
      ordinalRefFromGraph(graph, 0)
    );
  }

  return selectionRefFromGraph(graph);
}

/**
 * Prefer explicit named label when not deictic; else selection/ordinal SSOT.
 */
export function resolveUtteranceTargetRef(input: {
  readonly graph: SessionGraphV1 | null;
  readonly utterance: string;
  readonly namedLabel?: string | null;
}): GraphEntityRef | null {
  const named = input.namedLabel?.trim() || null;
  if (named && !isDeicticTargetLabel(named) && named.length <= 40) {
    return { labelKo: named, nodeId: null };
  }
  return resolveSelectionOrOrdinalRef(input.graph, input.utterance);
}
