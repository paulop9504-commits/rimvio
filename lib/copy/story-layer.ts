/**
 * Rimvio vocabulary stack — L0 Brand → L3 Engineering.
 * @see docs/RIMVIO_STORY_LAYER.md
 */

/** L0 — keynote · App Store · pitch. No tech words. */
export const STORY_L0 = {
  platform: {
    en: "Connect every capability. Execute what matters.",
    ko: "능력을 연결하고, 결과를 실행한다.",
  },
  agent: {
    en: "Say it. We perform.",
    ko: "해줘 — Rimvio가 실행한다.",
  },
  personal: {
    en: "Everything starts with context.",
    ko: "모든 것은 맥락에서 시작합니다.",
  },
  livingGlobe: {
    en: "Your trips and moments — replay when it matters.",
    ko: "여행과 순간 — 맞을 때 다시.",
  },
  external: {
    en: "Every place has a story. Now, it can remember yours.",
    ko: "모든 장소에는 이야기가 있습니다. 이제 그 장소는 당신의 이야기도 기억합니다.",
  },
  category: {
    en: "The world isn't made of apps. It's made of outcomes.",
    ko: "세상은 앱으로 이루어진 것이 아닙니다. 결과로 이루어져 있습니다.",
  },
  launchFilm: {
    en: "Leave something behind.",
    ko: "흔적을 남기세요.",
  },
  lifeMapped: {
    en: "Where you were. Who you were with. Back when it matters.",
    ko: "그때 거기, 함께한 사람 — 맞을 때 다시.",
  },
  memoryOs: {
    en: "Travel Market on a connected execution platform.",
    ko: "초연결 실행 플랫폼 위의 여행 Market",
  },
  mission: {
    en: "Intent. Agent. Runtime. Hub. You Commit.",
    ko: "의도 · Agent · Runtime · Hub — Commit은 당신.",
  },
} as const;

/** L1 — user-facing verbs (KO). Map to L3 via STORY_L1_TO_L3. */
export const STORY_L1_VERBS = {
  execute: "실행",
  perform: "해줘",
  approve: "승인",
  compare: "비교",
  prepare: "준비",
  leaveTrace: "흔적 남기기",
  leaveHere: "여기 남기기",
  discover: "발견",
  remember: "기억",
  recallThere: "그때 거기",
  continue: "이어가기",
  reExecute: "다시 실행",
  attach: "담기",
  create: "만들기",
} as const;

/** L1 UX vocabulary — system term → user-facing (see product copy guide). */
export const STORY_UX_VOCAB = {
  context: { system: "Context", ux: "결 / Pulse 흐름" },
  log: { system: "Log", ux: "기억 Memories / 발자취" },
  data: { system: "Data", ux: "일상 Moments" },
  density: { system: "Density", ux: "온도 / 활기" },
  algorithm: { system: "Algorithm", ux: "취향 Taste" },
  analysis: { system: "Analysis", ux: "발견 Discovery" },
  syncing: { system: "Syncing", ux: "연결 Connecting" },
  user: { system: "User", ux: "당신 / {name}님" },
} as const;

/** L1 — user-facing nouns (KO). */
export const STORY_L1_NOUNS = {
  trace: "흔적",
  context: "맥락",
  moment: "순간",
  experience: "경험",
  place: "장소",
} as const;

/** L2 — PRD · Cursor task nouns (EN). */
export const STORY_L2 = {
  trace: "Trace",
  context: "Context",
  hub: "Hub",
  resource: "Resource",
  mainSlot: "MAIN slot",
  recall: "Recall",
  lineage: "Lineage",
  pioneer: "Pioneer",
  meaning: "Meaning",
  visibility: "Visibility",
  /** Synaptic product framing — L2 PRD only; not L1 user copy */
  synapticConnection: "Synaptic connection",
  synapticGraph: "Synaptic context graph",
  triggerEdge: "Trigger edge",
  reExecute: "Re-execute",
} as const;

/** L3 — engineering anchors (code search terms). */
export const STORY_L3 = {
  pinEntity: "PinEntity",
  eventCandidate: "EventCandidate",
  contextHub: "ContextHubDefinition",
  contextResource: "ContextResource",
  rankContextResources: "rankContextResources",
  globeHubCarousel: "GlobeHubResourceCarousel",
  globeProjection: "Globe projection",
  projectionEngine: "Projection Engine",
  realityProjection: "RealityProjection",
  executionInbox: "Execution Inbox",
  realityCommit: "Reality Commit",
  realityExplorer: "Reality Explorer",
  projectTree: "Project Tree",
  /** L1 three surfaces — never Ontology jargon in UI. */
  surfaceGlobe: "Globe",
  surfaceInfo: "Info",
  surfaceExecutionInbox: "Execution Inbox",
  ingestBar: "GlobeContextIngestBar",
  stackPicker: "GlobeContextStackPicker",
  visibilityPrivate: "globeContextVisibility: private",
  actionRegistry: "mention-feature-registry",
} as const;

/** L1 user phrase → L3 implementation hint (for prompts & PRDs). */
export const STORY_L1_TO_L3 = {
  [STORY_L1_VERBS.leaveTrace]: [
    STORY_L3.ingestBar,
    STORY_L3.eventCandidate,
    STORY_L3.visibilityPrivate,
  ],
  [STORY_L1_VERBS.discover]: [
    "resolveGlobeContextsNearTap",
    STORY_L3.stackPicker,
  ],
  [STORY_L1_VERBS.recallThere]: [
    "useGlobeTripArrival",
    "project-relationship-meaning-line",
  ],
  [STORY_L1_VERBS.attach]: ["ingestGlobeContextFromFiles", "ingestGlobeContextFromText"],
} as const;

/** Never in user-facing UI (L1). Settings power-user exceptions noted in doc. */
export const STORY_FORBIDDEN_USER_FACING = [
  "업로드",
  "게시",
  "포스팅",
  "Geo Social",
  "Experience Graph",
  "Spatial Discovery Graph",
  "AI Experience Layer",
  "Marketplace",
  "좋아요",
  "별점",
  "리뷰 작성",
  "AI Assistant",
  "챗봇",
] as const;

/** Discouraged in hero · CTA · empty state — prefer L1 alternatives. */
export const STORY_DISCOURAGED_HERO = [
  "핀 박기",
  "GPS",
  "AI ",
  "LLM",
  "그래프",
] as const;

/** Cursor / agent header — story + engineering bridge. */
export function buildStoryLayerPromptHeader(
  surface: "agent" | "globe" | "feed" | "peers" = "agent",
) {
  const l0 =
    surface === "globe"
      ? `${STORY_L0.livingGlobe.en} / ${STORY_L0.livingGlobe.ko}`
      : surface === "agent"
        ? `${STORY_L0.agent.en} / ${STORY_L0.agent.ko}`
        : `${STORY_L0.platform.en} / ${STORY_L0.platform.ko}`;

  return [
    "# Story Layer (user-facing language)",
    `- L0: ${l0}`,
    `- Platform: ${STORY_L0.platform.ko} / ${STORY_L0.platform.en}`,
    `- Mission: ${STORY_L0.mission.ko} / ${STORY_L0.mission.en}`,
    `- L1 verbs: ${Object.values(STORY_L1_VERBS).join(" · ")}`,
    `- Default home: Agent (2D) — Globe is Travel projection (?surface=globe)`,
    `- Hub L0–L3: Platform → Market → Capability → Listing — docs/RIMVIO_AGENT_HUB_VISION.md`,
    `- Never say in UI: ${STORY_FORBIDDEN_USER_FACING.slice(0, 6).join(", ")}…`,
    `- Commit before Reality; chat is ingress not SSOT`,
    `- Full spec: docs/RIMVIO_STORY_LAYER.md`,
  ].join("\n");
}
