/**
 * Workspace Developer Kit — composable primitives.
 * Developers combine these; they do not ship arbitrary React apps.
 * @see docs/adr/067-workspace-engine-three-layers.md
 */

import {
  REALITY_PRIMITIVES,
  type RealityPrimitiveId,
} from "@/lib/reality-os/primitives";

/** WDK primitives = Reality execution primitives + View composition primitives. */
export const WDK_VIEW_PRIMITIVES = [
  "map",
  "timeline",
  "table",
  "graph",
  "ontology_tree",
  "panel",
  "card",
  "form",
  "filter",
  "search",
] as const;

export type WdkViewPrimitiveId = (typeof WDK_VIEW_PRIMITIVES)[number];

export const WDK_COMPOSITION_PRIMITIVES = [
  "object",
  "collection",
  "relation",
  "action",
  "event",
] as const;

export type WdkCompositionPrimitiveId = (typeof WDK_COMPOSITION_PRIMITIVES)[number];

export type WdkPrimitiveId =
  | RealityPrimitiveId
  | WdkViewPrimitiveId
  | WdkCompositionPrimitiveId;

export type WdkPrimitiveDef = {
  readonly id: WdkPrimitiveId;
  readonly layer: "data" | "object" | "view" | "cross";
  readonly labelKo: string;
  readonly descriptionKo: string;
};

const VIEW_DEFS: Record<WdkViewPrimitiveId, WdkPrimitiveDef> = {
  map: {
    id: "map",
    layer: "view",
    labelKo: "Map",
    descriptionKo: "GeoObject[] → marker · camera · select (View Contract 준수)",
  },
  timeline: {
    id: "timeline",
    layer: "view",
    labelKo: "Timeline",
    descriptionKo: "시간축 Object 투영",
  },
  table: {
    id: "table",
    layer: "view",
    labelKo: "Table",
    descriptionKo: "정렬·필터 가능한 tabular projection",
  },
  graph: {
    id: "graph",
    layer: "view",
    labelKo: "Graph",
    descriptionKo: "Relation edge 시각화",
  },
  ontology_tree: {
    id: "ontology_tree",
    layer: "view",
    labelKo: "Ontology",
    descriptionKo: "의미 구조 트리 — UI가 아닌 schema 탐색 surface",
  },
  panel: {
    id: "panel",
    layer: "view",
    labelKo: "Panel",
    descriptionKo: "Workspace SDK region 또는 side panel",
  },
  card: {
    id: "card",
    layer: "view",
    labelKo: "Card",
    descriptionKo: "단일 Object 요약 surface",
  },
  form: {
    id: "form",
    layer: "view",
    labelKo: "Form",
    descriptionKo: "Prepare/Commit 입력 surface",
  },
  filter: {
    id: "filter",
    layer: "view",
    labelKo: "Filter",
    descriptionKo: "Object subset 제한",
  },
  search: {
    id: "search",
    layer: "view",
    labelKo: "Search",
    descriptionKo: "Discovery ingress — Workspace Patch로 결과 반영",
  },
};

const COMPOSITION_DEFS: Record<WdkCompositionPrimitiveId, WdkPrimitiveDef> = {
  object: {
    id: "object",
    layer: "object",
    labelKo: "Object",
    descriptionKo: "Ontology Schema 인스턴스",
  },
  collection: {
    id: "collection",
    layer: "data",
    labelKo: "Collection",
    descriptionKo: "Data layer typed collection",
  },
  relation: {
    id: "relation",
    layer: "object",
    labelKo: "Relation",
    descriptionKo: "Object 간 의미 edge",
  },
  action: {
    id: "action",
    layer: "cross",
    labelKo: "Action",
    descriptionKo: "Capability 또는 View action hook",
  },
  event: {
    id: "event",
    layer: "cross",
    labelKo: "Event",
    descriptionKo: "select · hover · open 등 View event",
  },
};

/** All WDK primitive definitions for Hub Standards UI. */
export function listWdkPrimitives(): readonly WdkPrimitiveDef[] {
  const reality: WdkPrimitiveDef[] = REALITY_PRIMITIVES.map((id) => ({
    id,
    layer: "cross" as const,
    labelKo: id,
    descriptionKo: `Reality primitive · ${id}`,
  }));
  return [
    ...Object.values(COMPOSITION_DEFS),
    ...Object.values(VIEW_DEFS),
    ...reality,
  ];
}

export function wdkViewPrimitiveDef(id: WdkViewPrimitiveId): WdkPrimitiveDef {
  return VIEW_DEFS[id];
}
