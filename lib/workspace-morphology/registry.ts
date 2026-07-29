/**
 * Workspace Morphology — Context Type → familiar UI flesh (auto, never user-picked).
 * Six-region SDK skeleton stays fixed (ADR-026); morphology plugs Node / Focus feel.
 * @see docs/adr/033-context-type-workspace-morphology.md
 */

/** Morphology families — Node region flesh inside Workspace SDK. */
export const WORKSPACE_MORPHOLOGIES = [
  "spatial_timeline",
  "card_pipeline",
  "product_grid",
  "map_property",
  "dashboard_chart",
  "canvas_kanban",
  "code_workspace",
  "knowledge_graph",
  "tracker_timeline",
  "calendar",
  "ledger",
  "feed_graph",
  "business_canvas",
  "profile_matching",
  "vehicle_dashboard",
  "moodboard",
  "map_simulation",
  "document",
  "medical_record",
  "process_flow",
] as const;

export type WorkspaceMorphologyId = (typeof WORKSPACE_MORPHOLOGIES)[number];

/**
 * Context Type catalog — life / work domains on one Globe.
 * `live` = classifier + continuum/recipe wired; `catalog` = doctrine only.
 */
export const CONTEXT_TYPE_IDS = [
  "travel",
  "driver",
  "used_goods",
  "shopping",
  "real_estate",
  "invest",
  "work_project",
  "dev",
  "study",
  "health",
  "schedule",
  "finance",
  "social",
  "startup",
  "hiring",
  "vehicle",
  "interior",
  "real_estate_invest",
  "legal",
  "medical",
  "manufacturing",
] as const;

export type ContextTypeId = (typeof CONTEXT_TYPE_IDS)[number];

export type ContextTypeShip = "live" | "catalog";

export type ContextTypeDef = {
  readonly id: ContextTypeId;
  readonly labelKo: string;
  readonly morphologyId: WorkspaceMorphologyId;
  /** Familiar product metaphors (L2/docs — not L1 hero copy). */
  readonly familiarUx: readonly string[];
  /** One-line job of this morphology. */
  readonly coreQuestionKo: string;
  readonly ship: ContextTypeShip;
  /**
   * Workspace SDK kind when live — null until recipe ships.
   * Catalog rows stay null.
   */
  readonly sdkKind: "travel" | "driver" | "used_goods" | null;
};

export type MorphologyDef = {
  readonly id: WorkspaceMorphologyId;
  readonly labelKo: string;
  readonly familyKo: "Spatial" | "Workflow" | "Dashboard" | "Calendar" | "Canvas" | "Graph" | "Simulation" | "Ledger" | "Digital Twin" | "Feed" | "Document";
  /** Default Node surface hint for SDK hosts. */
  readonly nodeSurfaceHint:
    | "map"
    | "cards"
    | "list"
    | "thread"
    | "shell"
    | "grid"
    | "pipeline"
    | "timeline"
    | "dashboard"
    | "canvas"
    | "graph"
    | "calendar"
    | "ledger";
};

export const WORKSPACE_MORPHOLOGY_DEFS: Readonly<
  Record<WorkspaceMorphologyId, MorphologyDef>
> = {
  spatial_timeline: {
    id: "spatial_timeline",
    labelKo: "지도 + 일정",
    familyKo: "Spatial",
    nodeSurfaceHint: "map",
  },
  card_pipeline: {
    id: "card_pipeline",
    labelKo: "카드 + 거래 파이프라인",
    familyKo: "Workflow",
    nodeSurfaceHint: "pipeline",
  },
  product_grid: {
    id: "product_grid",
    labelKo: "상품 그리드",
    familyKo: "Dashboard",
    nodeSurfaceHint: "grid",
  },
  map_property: {
    id: "map_property",
    labelKo: "지도 + 매물",
    familyKo: "Spatial",
    nodeSurfaceHint: "map",
  },
  dashboard_chart: {
    id: "dashboard_chart",
    labelKo: "대시보드 + 차트",
    familyKo: "Dashboard",
    nodeSurfaceHint: "dashboard",
  },
  canvas_kanban: {
    id: "canvas_kanban",
    labelKo: "캔버스 + 칸반",
    familyKo: "Canvas",
    nodeSurfaceHint: "canvas",
  },
  code_workspace: {
    id: "code_workspace",
    labelKo: "코드 작업장",
    familyKo: "Canvas",
    nodeSurfaceHint: "shell",
  },
  knowledge_graph: {
    id: "knowledge_graph",
    labelKo: "지식 그래프",
    familyKo: "Graph",
    nodeSurfaceHint: "graph",
  },
  tracker_timeline: {
    id: "tracker_timeline",
    labelKo: "트래커 + 타임라인",
    familyKo: "Calendar",
    nodeSurfaceHint: "timeline",
  },
  calendar: {
    id: "calendar",
    labelKo: "캘린더",
    familyKo: "Calendar",
    nodeSurfaceHint: "calendar",
  },
  ledger: {
    id: "ledger",
    labelKo: "장부",
    familyKo: "Ledger",
    nodeSurfaceHint: "ledger",
  },
  feed_graph: {
    id: "feed_graph",
    labelKo: "피드 + 그래프",
    familyKo: "Feed",
    nodeSurfaceHint: "list",
  },
  business_canvas: {
    id: "business_canvas",
    labelKo: "비즈니스 캔버스",
    familyKo: "Canvas",
    nodeSurfaceHint: "canvas",
  },
  profile_matching: {
    id: "profile_matching",
    labelKo: "프로필 매칭",
    familyKo: "Graph",
    nodeSurfaceHint: "cards",
  },
  vehicle_dashboard: {
    id: "vehicle_dashboard",
    labelKo: "차량 대시보드",
    familyKo: "Dashboard",
    nodeSurfaceHint: "dashboard",
  },
  moodboard: {
    id: "moodboard",
    labelKo: "무드보드",
    familyKo: "Canvas",
    nodeSurfaceHint: "grid",
  },
  map_simulation: {
    id: "map_simulation",
    labelKo: "지도 + 시뮬레이션",
    familyKo: "Simulation",
    nodeSurfaceHint: "map",
  },
  document: {
    id: "document",
    labelKo: "문서 작업장",
    familyKo: "Document",
    nodeSurfaceHint: "list",
  },
  medical_record: {
    id: "medical_record",
    labelKo: "의료 기록",
    familyKo: "Document",
    nodeSurfaceHint: "list",
  },
  process_flow: {
    id: "process_flow",
    labelKo: "공정 플로우",
    familyKo: "Digital Twin",
    nodeSurfaceHint: "pipeline",
  },
};

export const CONTEXT_TYPE_DEFS: readonly ContextTypeDef[] = [
  {
    id: "travel",
    labelKo: "여행",
    morphologyId: "spatial_timeline",
    familiarUx: ["Google Maps", "Airbnb", "TripAdvisor"],
    coreQuestionKo: "어디에 있는가",
    ship: "live",
    sdkKind: "travel",
  },
  {
    id: "driver",
    labelKo: "대리 · 차량 운행",
    morphologyId: "vehicle_dashboard",
    familiarUx: ["카플랫폼", "내비게이션"],
    coreQuestionKo: "지금 어디로 가는가",
    ship: "live",
    sdkKind: "driver",
  },
  {
    id: "used_goods",
    labelKo: "중고거래",
    morphologyId: "card_pipeline",
    familiarUx: ["당근", "번개장터"],
    coreQuestionKo: "거래가 어디까지 왔는가",
    ship: "live",
    sdkKind: "used_goods",
  },
  {
    id: "shopping",
    labelKo: "쇼핑",
    morphologyId: "product_grid",
    familiarUx: ["쿠팡", "네이버 쇼핑"],
    coreQuestionKo: "무엇을 살 것인가",
    ship: "catalog",
    sdkKind: null,
  },
  {
    id: "real_estate",
    labelKo: "부동산",
    morphologyId: "map_property",
    familiarUx: ["네이버 부동산", "직방"],
    coreQuestionKo: "어디의 어떤 매물인가",
    ship: "catalog",
    sdkKind: null,
  },
  {
    id: "invest",
    labelKo: "투자",
    morphologyId: "dashboard_chart",
    familiarUx: ["HTS", "토스증권"],
    coreQuestionKo: "자산이 어떻게 움직이는가",
    ship: "catalog",
    sdkKind: null,
  },
  {
    id: "work_project",
    labelKo: "업무 프로젝트",
    morphologyId: "canvas_kanban",
    familiarUx: ["Notion", "Jira", "Trello"],
    coreQuestionKo: "일이 어느 단계인가",
    ship: "catalog",
    sdkKind: null,
  },
  {
    id: "dev",
    labelKo: "개발",
    morphologyId: "code_workspace",
    familiarUx: ["Cursor", "VS Code", "GitHub"],
    coreQuestionKo: "코드 Reality를 어떻게 바꾸는가",
    ship: "catalog",
    sdkKind: null,
  },
  {
    id: "study",
    labelKo: "공부",
    morphologyId: "knowledge_graph",
    familiarUx: ["Notion", "Anki"],
    coreQuestionKo: "무엇을 다음에 배울 것인가",
    ship: "catalog",
    sdkKind: null,
  },
  {
    id: "health",
    labelKo: "건강",
    morphologyId: "tracker_timeline",
    familiarUx: ["Apple Health", "Garmin"],
    coreQuestionKo: "오늘 몸이 어떤가",
    ship: "catalog",
    sdkKind: null,
  },
  {
    id: "schedule",
    labelKo: "일정",
    morphologyId: "calendar",
    familiarUx: ["캘린더"],
    coreQuestionKo: "언제인가",
    ship: "catalog",
    sdkKind: null,
  },
  {
    id: "finance",
    labelKo: "금융 · 가계부",
    morphologyId: "ledger",
    familiarUx: ["가계부"],
    coreQuestionKo: "돈이 어디로 갔는가",
    ship: "catalog",
    sdkKind: null,
  },
  {
    id: "social",
    labelKo: "SNS · 커뮤니티",
    morphologyId: "feed_graph",
    familiarUx: ["피드"],
    coreQuestionKo: "누구와 무엇이 연결되는가",
    ship: "catalog",
    sdkKind: null,
  },
  {
    id: "startup",
    labelKo: "창업",
    morphologyId: "business_canvas",
    familiarUx: ["Lean Canvas", "Pitch Deck"],
    coreQuestionKo: "무엇을 검증할 것인가",
    ship: "catalog",
    sdkKind: null,
  },
  {
    id: "hiring",
    labelKo: "채용",
    morphologyId: "profile_matching",
    familiarUx: ["LinkedIn"],
    coreQuestionKo: "누가 맞는가",
    ship: "catalog",
    sdkKind: null,
  },
  {
    id: "vehicle",
    labelKo: "차량",
    morphologyId: "vehicle_dashboard",
    familiarUx: ["카플랫폼"],
    coreQuestionKo: "차와 운행 상태는 어떤가",
    ship: "catalog",
    sdkKind: null,
  },
  {
    id: "interior",
    labelKo: "인테리어",
    morphologyId: "moodboard",
    familiarUx: ["Pinterest"],
    coreQuestionKo: "어떤 분위기를 만들 것인가",
    ship: "catalog",
    sdkKind: null,
  },
  {
    id: "real_estate_invest",
    labelKo: "부동산 투자",
    morphologyId: "map_simulation",
    familiarUx: ["지도 + 재무"],
    coreQuestionKo: "미래 가치는 어떤가",
    ship: "catalog",
    sdkKind: null,
  },
  {
    id: "legal",
    labelKo: "법률",
    morphologyId: "document",
    familiarUx: ["문서관리"],
    coreQuestionKo: "어떤 문서 Reality인가",
    ship: "catalog",
    sdkKind: null,
  },
  {
    id: "medical",
    labelKo: "의료",
    morphologyId: "medical_record",
    familiarUx: ["차트 · EMR"],
    coreQuestionKo: "환자 Reality는 어떤가",
    ship: "catalog",
    sdkKind: null,
  },
  {
    id: "manufacturing",
    labelKo: "생산관리 (B2B)",
    morphologyId: "process_flow",
    familiarUx: ["MES", "ERP", "Digital Twin"],
    coreQuestionKo: "공정 Reality는 어디인가",
    ship: "catalog",
    sdkKind: null,
  },
];

const BY_CONTEXT: Readonly<Record<ContextTypeId, ContextTypeDef>> =
  Object.fromEntries(
    CONTEXT_TYPE_DEFS.map((row) => [row.id, row]),
  ) as Record<ContextTypeId, ContextTypeDef>;

const SDK_KIND_TO_CONTEXT: Readonly<
  Record<"travel" | "driver" | "used_goods", ContextTypeId>
> = {
  travel: "travel",
  driver: "driver",
  used_goods: "used_goods",
};

export function contextTypeDef(id: ContextTypeId): ContextTypeDef {
  return BY_CONTEXT[id];
}

export function morphologyDef(id: WorkspaceMorphologyId): MorphologyDef {
  return WORKSPACE_MORPHOLOGY_DEFS[id];
}

/** SDK kind → morphology (live only). */
export function morphologyForSdkKind(
  kind: "travel" | "driver" | "used_goods",
): WorkspaceMorphologyId {
  return BY_CONTEXT[SDK_KIND_TO_CONTEXT[kind]].morphologyId;
}

export function contextTypeForSdkKind(
  kind: "travel" | "driver" | "used_goods",
): ContextTypeId {
  return SDK_KIND_TO_CONTEXT[kind];
}

export function listLiveContextTypes(): readonly ContextTypeDef[] {
  return CONTEXT_TYPE_DEFS.filter((row) => row.ship === "live");
}

export function listCatalogContextTypes(): readonly ContextTypeDef[] {
  return CONTEXT_TYPE_DEFS.filter((row) => row.ship === "catalog");
}

/**
 * Resolve morphology for an utterance when a Workspace kind is known.
 * Never asks the user which UI to open.
 */
export function resolveWorkspaceMorphology(input: {
  readonly sdkKind: "travel" | "driver" | "used_goods";
}): {
  readonly contextTypeId: ContextTypeId;
  readonly morphologyId: WorkspaceMorphologyId;
  readonly morphology: MorphologyDef;
  readonly context: ContextTypeDef;
} {
  const contextTypeId = contextTypeForSdkKind(input.sdkKind);
  const context = contextTypeDef(contextTypeId);
  const morphology = morphologyDef(context.morphologyId);
  return {
    contextTypeId,
    morphologyId: context.morphologyId,
    morphology,
    context,
  };
}
