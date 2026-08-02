/**
 * Globe Reality Interface — Reality Desktop hierarchy (Read Only Projection).
 *
 * Earth → Region → Location → Context → Entity
 *
 * Globe is NOT a map search UI. It is a Reality file-system view.
 * All edits happen in Workspace. Globe never mutates Reality.
 */

export const REALITY_DESKTOP_LEVELS = [
  "earth",
  "region",
  "location",
  "context",
  "entity",
] as const;

export type RealityDesktopLevel = (typeof REALITY_DESKTOP_LEVELS)[number];

export const REALITY_NODE_KINDS = [
  "region",
  "context",
  "entity",
] as const;

export type RealityNodeKind = (typeof REALITY_NODE_KINDS)[number];

/** Shared projection node — view only. */
export type RealityProjectionNode = {
  readonly id: string;
  readonly kind: RealityNodeKind;
  readonly level: RealityDesktopLevel;
  readonly titleKo: string;
  readonly subtitleKo?: string | null;
  readonly pathLabels: readonly string[];
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly contextId?: string | null;
  readonly entityId?: string | null;
  readonly childCount?: number;
  /** Always true on Globe — constitution */
  readonly readOnly: true;
};

export type RealityDesktopPath = {
  readonly earth: string;
  readonly region?: string | null;
  readonly location?: string | null;
  readonly contextId?: string | null;
  readonly entityId?: string | null;
  readonly labels: readonly string[];
};

export type GlobeRealityInterfaceModel = {
  readonly path: RealityDesktopPath;
  readonly regionNodes: readonly RealityProjectionNode[];
  readonly contextNodes: readonly RealityProjectionNode[];
  readonly entityNodes: readonly RealityProjectionNode[];
  readonly selectedContextId: string | null;
  readonly selectedEntityId: string | null;
  readonly viewOnly: true;
  readonly mayEdit: false;
};

export function buildRealityDesktopPath(input: {
  readonly earth?: string;
  readonly region?: string | null;
  readonly location?: string | null;
  readonly contextTitle?: string | null;
}): RealityDesktopPath {
  const earth = input.earth?.trim() || "Earth";
  const region = input.region?.trim() || null;
  const location = input.location?.trim() || null;
  const contextTitle = input.contextTitle?.trim() || null;
  const labels = [earth, region, location, contextTitle].filter(
    (x): x is string => Boolean(x),
  );
  return {
    earth,
    region,
    location,
    contextId: null,
    entityId: null,
    labels,
  };
}

export function createRegionNode(input: {
  readonly id: string;
  readonly titleKo: string;
  readonly subtitleKo?: string | null;
  readonly pathLabels?: readonly string[];
  readonly childCount?: number;
  readonly lat?: number | null;
  readonly lng?: number | null;
}): RealityProjectionNode {
  return {
    id: input.id,
    kind: "region",
    level: "region",
    titleKo: input.titleKo,
    subtitleKo: input.subtitleKo ?? null,
    pathLabels: input.pathLabels ?? ["Earth", input.titleKo],
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    childCount: input.childCount,
    readOnly: true,
  };
}

export function createContextProjectionNode(input: {
  readonly id: string;
  readonly contextId: string;
  readonly titleKo: string;
  readonly subtitleKo?: string | null;
  readonly pathLabels?: readonly string[];
  readonly childCount?: number;
  readonly lat?: number | null;
  readonly lng?: number | null;
}): RealityProjectionNode {
  return {
    id: input.id,
    kind: "context",
    level: "context",
    titleKo: input.titleKo,
    subtitleKo: input.subtitleKo ?? null,
    pathLabels: input.pathLabels ?? [],
    contextId: input.contextId,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    childCount: input.childCount,
    readOnly: true,
  };
}

export function createEntityProjectionNode(input: {
  readonly id: string;
  readonly entityId: string;
  readonly titleKo: string;
  readonly subtitleKo?: string | null;
  readonly contextId?: string | null;
  readonly pathLabels?: readonly string[];
  readonly lat?: number | null;
  readonly lng?: number | null;
}): RealityProjectionNode {
  return {
    id: input.id,
    kind: "entity",
    level: "entity",
    titleKo: input.titleKo,
    subtitleKo: input.subtitleKo ?? null,
    pathLabels: input.pathLabels ?? [],
    contextId: input.contextId ?? null,
    entityId: input.entityId,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    readOnly: true,
  };
}

/** Korea demo path for Reality Desktop — Earth → 대한민국 → … */
export function buildKoreaRealityDesktopSeed(input?: {
  readonly location?: string | null;
  readonly contexts?: readonly {
    readonly contextId: string;
    readonly titleKo: string;
    readonly subtitleKo?: string | null;
    readonly lat?: number | null;
    readonly lng?: number | null;
    readonly entities?: readonly {
      readonly entityId: string;
      readonly titleKo: string;
      readonly subtitleKo?: string | null;
      readonly lat?: number | null;
      readonly lng?: number | null;
    }[];
  }[];
}): GlobeRealityInterfaceModel {
  const location = input?.location?.trim() || "서울";
  const path = buildRealityDesktopPath({
    earth: "Earth",
    region: "대한민국",
    location,
  });

  const regionNodes = [
    createRegionNode({
      id: "region_kr",
      titleKo: "대한민국",
      subtitleKo: "Region",
      pathLabels: ["Earth", "대한민국"],
      childCount: 2,
      lat: 36.5,
      lng: 127.8,
    }),
    createRegionNode({
      id: "region_seoul",
      titleKo: "서울",
      subtitleKo: "Location",
      pathLabels: ["Earth", "대한민국", "서울"],
      childCount: input?.contexts?.length ?? 0,
      lat: 37.5665,
      lng: 126.978,
    }),
    createRegionNode({
      id: "region_daejeon",
      titleKo: "대전",
      subtitleKo: "Location",
      pathLabels: ["Earth", "대한민국", "대전"],
      lat: 36.3504,
      lng: 127.3845,
    }),
  ];

  const contexts = input?.contexts ?? [];
  const contextNodes = contexts.map((c) =>
    createContextProjectionNode({
      id: `ctx_node_${c.contextId}`,
      contextId: c.contextId,
      titleKo: c.titleKo,
      subtitleKo: c.subtitleKo ?? "Context",
      pathLabels: [...path.labels, c.titleKo],
      childCount: c.entities?.length ?? 0,
      lat: c.lat ?? null,
      lng: c.lng ?? null,
    }),
  );

  const entityNodes = contexts.flatMap((c) =>
    (c.entities ?? []).map((e) =>
      createEntityProjectionNode({
        id: `ent_node_${e.entityId}`,
        entityId: e.entityId,
        contextId: c.contextId,
        titleKo: e.titleKo,
        subtitleKo: e.subtitleKo ?? "Entity",
        pathLabels: [...path.labels, c.titleKo, e.titleKo],
        lat: e.lat ?? null,
        lng: e.lng ?? null,
      }),
    ),
  );

  return {
    path,
    regionNodes,
    contextNodes,
    entityNodes,
    selectedContextId: null,
    selectedEntityId: null,
    viewOnly: true,
    mayEdit: false,
  };
}
