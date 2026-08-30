/**
 * Workspace 3-layer model — Data · Object · View.
 * @see docs/adr/067-workspace-engine-three-layers.md
 *
 * Map/Timeline/Graph are View-layer surfaces — not Capabilities.
 * Capabilities mutate Data/Object; Views project them.
 */

export const WORKSPACE_ENGINE_LAYERS = ["data", "object", "view"] as const;

export type WorkspaceEngineLayer = (typeof WORKSPACE_ENGINE_LAYERS)[number];

export type WorkspaceLayerSpec = {
  readonly id: WorkspaceEngineLayer;
  readonly titleKo: string;
  readonly descriptionKo: string;
  readonly examplesKo: readonly string[];
  readonly ssotPaths: readonly string[];
};

export const WORKSPACE_LAYER_SPECS: Readonly<
  Record<WorkspaceEngineLayer, WorkspaceLayerSpec>
> = {
  data: {
    id: "data",
    titleKo: "Data Layer",
    descriptionKo:
      "원시·구조화 정보 — 호텔/상품/장소, 사람/주문/일정, 가격/재고. Workspace Patch와 manifest data collections.",
    examplesKo: ["호텔/상품/장소", "사람/주문/일정", "가격/재고"],
    ssotPaths: [
      "lib/context-workspace/workspace-store.ts",
      "lib/context-workspace/workspace-patch/",
      "lib/platform-sdk/types.ts → PlatformDataDeclaration",
    ],
  },
  object: {
    id: "object",
    titleKo: "Object Layer",
    descriptionKo:
      "Domain Object — Hotel, Product, Order 등 Ontology Schema가 정의한 타입의 인스턴스. ContextWorkspaceNode · RealityObject.",
    examplesKo: ["Hotel Object", "Product Object", "Order Object", "Property Object"],
    ssotPaths: [
      "lib/context-workspace/types.ts → ContextWorkspaceNode",
      "lib/reality-object/types.ts",
      "lib/workspace-engine/ontology/",
    ],
  },
  view: {
    id: "view",
    titleKo: "View Layer",
    descriptionKo:
      "관찰·조작 Surface — Map, Timeline, Table, Graph, Ontology tree. SSOT를 변경하지 않고 Object를 투영.",
    examplesKo: ["Map", "Timeline", "Table", "Graph", "Ontology"],
    ssotPaths: [
      "lib/workspace-engine/view-contracts/",
      "lib/context-workspace/projection/",
      "lib/workspace-sdk/types.ts → WorkspaceSdkNodeSurface",
    ],
  },
};

/** View surfaces are never Capabilities — enforce at compile/policy time. */
export function isViewLayerArtifact(kind: string): boolean {
  return (
    kind === "view" ||
    kind === "view_extension" ||
    kind === "map" ||
    kind === "timeline" ||
    kind === "table" ||
    kind === "graph" ||
    kind === "ontology_view"
  );
}
