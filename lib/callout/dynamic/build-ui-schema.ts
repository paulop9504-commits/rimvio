/**
 * Build per-state UI Schema — Dynamic Callout Control Surface.
 * Fixed layouts are forbidden; renderer consumes blocks only.
 */

import type {
  CalloutUiAction,
  CalloutUiBlock,
  DynamicCalloutInput,
  DynamicCalloutSchema,
  DynamicCalloutState,
} from "@/lib/callout/dynamic/types";
import { resolveDynamicCalloutState } from "@/lib/callout/dynamic/resolve-state";

function fingerprintOf(input: {
  readonly state: DynamicCalloutState;
  readonly objectId: string;
  readonly contextId: string;
  readonly intentAction: string;
  readonly agentPhase: string;
  readonly situationKo: string;
}): string {
  return [
    input.state,
    input.objectId,
    input.contextId,
    input.intentAction,
    input.agentPhase,
    input.situationKo,
  ].join("|");
}

function formatWonDelta(delta: number | null): string | null {
  if (delta == null || !Number.isFinite(delta)) return null;
  if (delta === 0) return "가격 변화 없음";
  const abs = Math.abs(Math.round(delta)).toLocaleString("ko-KR");
  return delta < 0 ? `가격 ${abs}원 감소` : `가격 ${abs}원 증가`;
}

function formatDistanceDelta(meters: number | null): string | null {
  if (meters == null || !Number.isFinite(meters)) return null;
  if (meters === 0) return "거리 변화 없음";
  const abs = Math.abs(Math.round(meters));
  const label = abs >= 1000 ? `${(abs / 1000).toFixed(1)}km` : `${abs}m`;
  return meters < 0 ? `거리 ${label} 가까움` : `거리 ${label} 멀어짐`;
}

function headerBlock(
  state: DynamicCalloutState,
  title: string,
  situationKo: string | null,
): CalloutUiBlock {
  return {
    id: "header",
    kind: "header",
    labelKo: state,
    bodyKo: situationKo,
    valueKo: title,
    primary: true,
    meta: { controlSurface: true },
  };
}

function buildDiscoverBlocks(input: DynamicCalloutInput): CalloutUiBlock[] {
  const blocks: CalloutUiBlock[] = [
    headerBlock(
      "Discover",
      input.object.title,
      input.context.situationKo ?? input.context.titleKo,
    ),
    {
      id: "evidence",
      kind: "evidence",
      labelKo: "Evidence",
      bodyKo:
        input.object.evidence
          .filter((e) => e.present)
          .map((e) => `${e.title}: ${e.value}`)
          .join(" · ") || "근거 수집 중",
      valueKo: null,
      primary: true,
      meta: {
        items: input.object.evidence.filter((e) => e.present),
      },
    },
    {
      id: "why",
      kind: "why",
      labelKo: "추천 이유",
      bodyKo: input.object.whyLinesKo.join(" · ") || "Context 기반 후보",
      valueKo: null,
      primary: false,
      meta: { lines: [...input.object.whyLinesKo] },
    },
  ];
  return blocks;
}

function buildAnalyzeBlocks(input: DynamicCalloutInput): CalloutUiBlock[] {
  return [
    headerBlock(
      "Analyze",
      input.object.title,
      input.context.situationKo,
    ),
    {
      id: "problem",
      kind: "note",
      labelKo: "문제",
      bodyKo: input.agent?.problemKo ?? "조건 재검토",
      valueKo: null,
      primary: true,
      meta: {},
    },
    {
      id: "recommendation",
      kind: "note",
      labelKo: "추천",
      bodyKo: input.agent?.recommendationKo ?? "Workspace에서 분석",
      valueKo: null,
      primary: false,
      meta: {},
    },
    {
      id: "why",
      kind: "why",
      labelKo: "추천 이유",
      bodyKo: input.object.whyLinesKo.join(" · ") || null,
      valueKo: null,
      primary: false,
      meta: {},
    },
  ];
}

function buildCompareBlocks(input: DynamicCalloutInput): CalloutUiBlock[] {
  const cmp = input.compare;
  const priceKo =
    cmp?.priceDeltaKo ?? formatWonDelta(cmp?.priceDeltaWon ?? null);
  const distKo =
    cmp?.distanceDeltaKo ??
    formatDistanceDelta(cmp?.distanceDeltaMeters ?? null);

  return [
    headerBlock(
      "Compare",
      input.object.title,
      cmp?.alternativeTitle
        ? `vs ${cmp.alternativeTitle}`
        : input.context.situationKo,
    ),
    {
      id: "impact",
      kind: "impact",
      labelKo: "Impact",
      bodyKo: cmp?.impactSummaryKo ?? "비교 Impact 계산",
      valueKo: null,
      primary: true,
      meta: {},
    },
    {
      id: "price_delta",
      kind: "price_delta",
      labelKo: "가격 변화",
      bodyKo: priceKo,
      valueKo: priceKo,
      primary: false,
      meta: { priceDeltaWon: cmp?.priceDeltaWon ?? null },
    },
    {
      id: "distance_delta",
      kind: "distance_delta",
      labelKo: "거리 변화",
      bodyKo: distKo,
      valueKo: distKo,
      primary: false,
      meta: { distanceDeltaMeters: cmp?.distanceDeltaMeters ?? null },
    },
  ];
}

function buildSimulateBlocks(input: DynamicCalloutInput): CalloutUiBlock[] {
  return [
    headerBlock("Simulate", input.object.title, input.context.situationKo),
    {
      id: "simulation",
      kind: "simulation",
      labelKo: "Simulation",
      bodyKo:
        input.agent?.recommendationKo ??
        "What-if 미리보기 · Reality 변경 없음",
      valueKo: "SIMULATION_ONLY",
      primary: true,
      meta: { simulationOnly: true },
    },
    {
      id: "impact",
      kind: "impact",
      labelKo: "Impact",
      bodyKo: input.compare?.impactSummaryKo ?? "시뮬 Impact 대기",
      valueKo: null,
      primary: false,
      meta: {},
    },
  ];
}

function buildPrepareBlocks(input: DynamicCalloutInput): CalloutUiBlock[] {
  return [
    headerBlock("Prepare", input.object.title, input.context.situationKo),
    {
      id: "prepare",
      kind: "prepare",
      labelKo: "Prepare",
      bodyKo: input.object.canPrepare
        ? "예약 준비 Draft 생성"
        : "Prepare 불가 · 정보 부족",
      valueKo: input.object.priceLabelKo,
      primary: true,
      meta: { canPrepare: input.object.canPrepare },
    },
    {
      id: "note",
      kind: "note",
      labelKo: "안내",
      bodyKo: "Callout은 Prepare까지 · Commit은 Field",
      valueKo: null,
      primary: false,
      meta: {},
    },
  ];
}

function buildCommitBlocks(input: DynamicCalloutInput): CalloutUiBlock[] {
  // Callout must not Commit — schema is Field handoff only
  return [
    headerBlock("Commit", input.object.title, "Field Reality Action"),
    {
      id: "commit_handoff",
      kind: "commit_handoff",
      labelKo: "Commit",
      bodyKo: "Callout에서 Commit 불가 · Field로 넘기세요",
      valueKo: "Field",
      primary: true,
      meta: { handoffOnly: true, commitForbiddenInCallout: true },
    },
  ];
}

function actionsForState(
  state: DynamicCalloutState,
  canPrepare: boolean,
): readonly CalloutUiAction[] {
  switch (state) {
    case "Discover":
      return [
        {
          id: "analyze",
          labelKo: "분석",
          enabled: true,
          primary: false,
          verb: "analyze",
        },
        {
          id: "compare",
          labelKo: "비교",
          enabled: true,
          primary: true,
          verb: "compare",
        },
      ];
    case "Analyze":
      return [
        {
          id: "compare",
          labelKo: "비교",
          enabled: true,
          primary: true,
          verb: "compare",
        },
        {
          id: "simulate",
          labelKo: "시뮬",
          enabled: true,
          primary: false,
          verb: "simulate",
        },
      ];
    case "Compare":
      return [
        {
          id: "simulate",
          labelKo: "시뮬",
          enabled: true,
          primary: false,
          verb: "simulate",
        },
        {
          id: "prepare",
          labelKo: "Prepare",
          enabled: canPrepare,
          primary: true,
          verb: "prepare",
        },
      ];
    case "Simulate":
      return [
        {
          id: "prepare",
          labelKo: "Prepare",
          enabled: canPrepare,
          primary: true,
          verb: "prepare",
        },
      ];
    case "Prepare":
      return [
        {
          id: "handoff",
          labelKo: "Field로",
          enabled: true,
          primary: true,
          verb: "handoff_field",
        },
      ];
    case "Commit":
      return [
        {
          id: "handoff",
          labelKo: "Field에서 확정",
          enabled: true,
          primary: true,
          verb: "handoff_field",
        },
      ];
  }
}

function blocksForState(
  state: DynamicCalloutState,
  input: DynamicCalloutInput,
): readonly CalloutUiBlock[] {
  switch (state) {
    case "Discover":
      return buildDiscoverBlocks(input);
    case "Analyze":
      return buildAnalyzeBlocks(input);
    case "Compare":
      return buildCompareBlocks(input);
    case "Simulate":
      return buildSimulateBlocks(input);
    case "Prepare":
      return buildPrepareBlocks(input);
    case "Commit":
      return buildCommitBlocks(input);
  }
}

function summaryForState(
  state: DynamicCalloutState,
  input: DynamicCalloutInput,
): string {
  switch (state) {
    case "Discover":
      return `Discover · Evidence · 추천 이유 · ${input.object.title}`;
    case "Analyze":
      return `Analyze · ${input.agent?.problemKo ?? "분석"}`;
    case "Compare":
      return `Compare · Impact · 가격 변화 · 거리 변화`;
    case "Simulate":
      return `Simulate · SIMULATION_ONLY`;
    case "Prepare":
      return `Prepare · ${input.object.title}`;
    case "Commit":
      return `Commit · Field handoff only`;
  }
}

/**
 * Generate Dynamic Callout UI Schema.
 * Same hotel + different Context/Intent/Agent → different schema.
 */
export function buildDynamicCalloutSchema(
  input: DynamicCalloutInput,
): DynamicCalloutSchema {
  const state = resolveDynamicCalloutState(input);
  const blocks = blocksForState(state, input);
  const actions = actionsForState(state, input.object.canPrepare);
  const fingerprint = fingerprintOf({
    state,
    objectId: input.object.id,
    contextId: input.context.contextId,
    intentAction: input.intent?.action ?? "none",
    agentPhase: input.agent?.phase ?? "none",
    situationKo: input.context.situationKo ?? input.context.titleKo,
  });

  return {
    state,
    objectId: input.object.id,
    objectTitle: input.object.title,
    contextId: input.context.contextId,
    blocks,
    actions,
    fingerprint,
    fixedUi: false,
    commitForbiddenInCallout: true,
    summaryKo: summaryForState(state, input),
  };
}

/** UX text dump for tests / debug — not a fixed component tree */
export function formatDynamicCalloutUxKo(schema: DynamicCalloutSchema): string {
  const lines = [`Callout · ${schema.state}`, schema.objectTitle, ""];
  for (const b of schema.blocks) {
    if (b.kind === "header") continue;
    lines.push(b.labelKo);
    if (b.bodyKo) lines.push(b.bodyKo);
    else if (b.valueKo) lines.push(b.valueKo);
    lines.push("");
  }
  const primary = schema.actions.find((a) => a.primary);
  if (primary) lines.push(`[${primary.labelKo}]`);
  return lines.join("\n").trim();
}
