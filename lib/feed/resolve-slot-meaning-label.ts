/**
 * Resolve one MEANING micro-surface line for a Feed slot ("민수 = 제주").
 * Phase 2 OK — single contextual hint, not a graph explorer.
 */

import { buildMeaningGraph } from "@/lib/meaning/build-meaning-graph";
import { topMeaningEdges } from "@/lib/meaning/rank-meaning-graph";
import { MEANING_MIN_EDGE_TOTAL } from "@/lib/meaning/meaning-types";
import type { EventCandidate } from "@/lib/events/event-candidate";

function labelSet(labels: readonly string[]): Set<string> {
  return new Set(
    labels
      .map((label) => label.trim())
      .filter((label) => label.length > 0),
  );
}

function edgeTouchesSlot(
  edge: { fromLabel: string; toLabel: string },
  people: ReadonlySet<string>,
  places: ReadonlySet<string>,
): boolean {
  const ends = [edge.fromLabel, edge.toLabel];
  const hitsPerson = ends.some((label) => people.has(label));
  const hitsPlace = ends.some((label) => places.has(label));
  if (people.size > 0 && places.size > 0) {
    return hitsPerson && hitsPlace;
  }
  if (people.size > 0) {
    return hitsPerson;
  }
  if (places.size > 0) {
    return hitsPlace;
  }
  return false;
}

/** Pure — strongest edge that intersects this slot's people/place labels. */
export function resolveSlotMeaningLabel(input: {
  events: readonly EventCandidate[];
  peopleLabels: readonly string[];
  placeLabels: readonly string[];
}): string | null {
  const people = labelSet(input.peopleLabels);
  const places = labelSet(input.placeLabels);
  if (people.size === 0 && places.size === 0) {
    return null;
  }
  if (input.events.length === 0) {
    return null;
  }

  const graph = buildMeaningGraph(input.events);
  const edges = topMeaningEdges(graph, { limit: 12 });
  const slotHit = edges.find(
    (edge) =>
      edge.score.total >= MEANING_MIN_EDGE_TOTAL &&
      edgeTouchesSlot(edge, people, places),
  );
  if (slotHit?.meaningLabel.trim()) {
    return slotHit.meaningLabel.trim();
  }

  const anyHit = edges.find((edge) => edgeTouchesSlot(edge, people, places));
  const label = anyHit?.meaningLabel.trim();
  return label || null;
}
