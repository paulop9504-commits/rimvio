/**
 * Build ≤4 Capability Callouts + thin Live Pulse for a Workspace place hub.
 * Empty capabilities / signals are omitted — bloom stays sparse and clean.
 */

import type { NodePreviewModel } from "@/lib/context-workspace/build-node-preview";
import type { PlaceBrief } from "@/lib/context-workspace/place-brief/types";
import type {
  CapabilityEvidenceItem,
  CapabilityLiveSignal,
  WorkspaceCapabilityBundle,
  WorkspaceCapabilityCallout,
  WorkspaceCapabilityRecipe,
} from "@/lib/context-workspace/capability-callout/types";

const MAX_CALLOUTS = 4;

function splitWhy(why: string): string[] {
  const raw = why
    .split(/[·•|/]|(?:\s*[-–—]\s*)/u)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && s.length <= 48);
  return [...new Set(raw)].slice(0, 4);
}

function insightLines(
  preview: NodePreviewModel,
  brief: PlaceBrief | null | undefined,
): string[] {
  const fromBrief = (brief?.featuresKo ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  if (fromBrief.length >= 2) return fromBrief;

  const fromWhy = splitWhy(preview.whyChosen);
  if (fromWhy.length >= 2) return fromWhy;

  const lines: string[] = [];
  if (brief?.routeFitKo?.trim()) lines.push(brief.routeFitKo.trim());
  if (preview.whyChosen.trim()) lines.push(preview.whyChosen.trim().slice(0, 60));
  if (preview.nearby[0]) {
    lines.push(preview.nearby[0].labelKo.replace(/^[^\s]+\s/u, "").slice(0, 40));
  }
  for (const a of preview.amenities.slice(0, 2)) {
    if (!lines.includes(a)) lines.push(a);
  }
  return lines.slice(0, 4);
}

function buildEvidence(input: {
  preview: NodePreviewModel;
  brief: PlaceBrief | null | undefined;
  draftDayLabelKo: string | null | undefined;
}): readonly CapabilityEvidenceItem[] {
  const { preview, brief, draftDayLabelKo } = input;
  const hasReview =
    preview.rating != null ||
    (typeof preview.reviewSummary === "string" &&
      preview.reviewSummary !== "후기 없음") ||
    Boolean(brief?.reviewSummaryKo?.trim());
  const hasPrice =
    Boolean(preview.price?.trim()) &&
    preview.price !== "가격 미정" &&
    preview.price !== "—";
  const hasSchedule = Boolean(draftDayLabelKo?.trim() || brief?.routeFitKo?.trim());
  const hasDistance = preview.nearby.length > 0;

  return [
    { id: "review", labelKo: "리뷰", present: hasReview },
    { id: "price", labelKo: "가격", present: hasPrice },
    { id: "schedule", labelKo: "일정", present: hasSchedule },
    { id: "distance", labelKo: "거리", present: hasDistance },
  ];
}

/** Palantir-style confidence from grounded evidence only — never invent. */
export function scoreInsightConfidence(
  evidence: readonly CapabilityEvidenceItem[],
  lineCount: number,
): number {
  const present = evidence.filter((e) => e.present).length;
  const base = 0.52;
  const fromEvidence = present * 0.1;
  const fromLines = Math.min(0.12, lineCount * 0.03);
  return Math.min(0.96, Math.round((base + fromEvidence + fromLines) * 100) / 100);
}

function buildInsight(
  preview: NodePreviewModel,
  brief: PlaceBrief | null | undefined,
  draftDayLabelKo: string | null | undefined,
): WorkspaceCapabilityCallout | null {
  const lines = insightLines(preview, brief);
  if (lines.length === 0 && !brief?.introKo?.trim()) return null;
  const body =
    lines.length > 0
      ? lines
      : [brief!.introKo!.trim().slice(0, 80)];
  const evidence = buildEvidence({ preview, brief, draftDayLabelKo });
  const confidence = scoreInsightConfidence(evidence, body.length);
  return {
    id: "insight",
    kind: "insight",
    labelKo: "AI 추천",
    valueKo: `${Math.round(confidence * 100)}%`,
    linesKo: body,
    confidence,
    icon: "sparkle",
    evidence,
  };
}

function buildPrice(preview: NodePreviewModel): WorkspaceCapabilityCallout | null {
  if (!preview.price || preview.price === "가격 미정" || preview.price === "—") {
    return null;
  }
  return {
    id: "price",
    kind: "price",
    labelKo: "가격",
    valueKo: preview.price,
    linesKo: [
      preview.price,
      preview.canPrepare ? "예약 준비로 이어갈 수 있어요" : "후보 가격 · 변동 가능",
    ],
    confidence: null,
    icon: "price",
  };
}

function buildReview(preview: NodePreviewModel): WorkspaceCapabilityCallout | null {
  if (preview.rating == null && preview.reviewSummary === "후기 없음") {
    return null;
  }
  const lines = [
    preview.ratingLabel,
    preview.reviewSummary,
    ...preview.amenities.slice(0, 2),
  ].filter(Boolean);
  return {
    id: "review",
    kind: "review",
    labelKo: "후기",
    valueKo: preview.ratingLabel,
    linesKo: lines,
    confidence: null,
    icon: "star",
  };
}

function buildNearby(preview: NodePreviewModel): WorkspaceCapabilityCallout | null {
  if (preview.nearby.length === 0) return null;
  const lines = preview.nearby.slice(0, 3).map((n) => n.labelKo);
  return {
    id: "nearby",
    kind: "nearby",
    labelKo: "주변",
    valueKo: `${preview.nearby.length}곳`,
    linesKo: lines,
    confidence: null,
    icon: "pin",
  };
}

function buildDay(
  draftDayLabelKo: string | null | undefined,
): WorkspaceCapabilityCallout | null {
  const label = draftDayLabelKo?.trim();
  if (!label) return null;
  return {
    id: "day",
    kind: "day",
    labelKo: "일정",
    valueKo: label,
    linesKo: [`${label} 동선에 맞춰 둔 숙소예요`],
    confidence: null,
    icon: "calendar",
  };
}

function buildAction(preview: NodePreviewModel): WorkspaceCapabilityCallout | null {
  if (!preview.canPrepare) return null;
  return {
    id: "action",
    kind: "action",
    labelKo: "실행",
    valueKo: "예약 준비",
    linesKo: ["선택 · 비교 · 고정 · 예약 준비"],
    confidence: null,
    icon: "bolt",
  };
}

/** Live pulse — only grounded facts (no fake crowd/weather/rooms). */
export function buildWorkspaceLiveSignals(input: {
  preview: NodePreviewModel;
  brief?: PlaceBrief | null;
  draftDayLabelKo?: string | null;
}): readonly CapabilityLiveSignal[] {
  const { preview, brief, draftDayLabelKo } = input;
  const out: CapabilityLiveSignal[] = [];

  if (
    preview.price &&
    preview.price !== "가격 미정" &&
    preview.price !== "—"
  ) {
    out.push({
      id: "price",
      labelKo: "가격",
      valueKo: preview.price,
      tone: "neutral",
    });
  }

  if (preview.rating != null) {
    out.push({
      id: "rating",
      labelKo: "평점",
      valueKo: preview.ratingLabel,
      tone: preview.rating >= 8 || preview.rating >= 4.2 ? "good" : "neutral",
    });
  } else if (preview.reviewSummary !== "후기 없음") {
    out.push({
      id: "reviews",
      labelKo: "후기",
      valueKo: preview.reviewSummary,
      tone: "neutral",
    });
  }

  if (preview.nearby[0]) {
    const first = preview.nearby[0].labelKo.replace(/^[^\s]+\s/u, "");
    out.push({
      id: "nearby",
      labelKo: "주변",
      valueKo: first.slice(0, 18),
      tone: "good",
    });
  }

  if (draftDayLabelKo?.trim()) {
    out.push({
      id: "day",
      labelKo: "일정",
      valueKo: draftDayLabelKo.trim(),
      tone: "neutral",
    });
  } else if (brief?.routeFitKo?.trim()) {
    out.push({
      id: "route",
      labelKo: "동선",
      valueKo: brief.routeFitKo.trim().slice(0, 18),
      tone: "good",
    });
  }

  if (preview.canPrepare) {
    out.push({
      id: "prep",
      labelKo: "상태",
      valueKo: "예약 준비 가능",
      tone: "good",
    });
  }

  return out.slice(0, 5);
}

const RECIPE_ORDER: Record<
  WorkspaceCapabilityRecipe,
  readonly WorkspaceCapabilityCallout["kind"][]
> = {
  travel: ["insight", "price", "review", "nearby", "day", "action"],
  business: ["insight", "nearby", "price", "action", "review", "day"],
  date: ["insight", "review", "nearby", "price", "day", "action"],
};

export function buildWorkspaceCapabilityCallouts(input: {
  preview: NodePreviewModel;
  brief?: PlaceBrief | null;
  draftDayLabelKo?: string | null;
  recipe?: WorkspaceCapabilityRecipe;
}): readonly WorkspaceCapabilityCallout[] {
  return buildWorkspaceCapabilityBundle(input).callouts;
}

export function buildWorkspaceCapabilityBundle(input: {
  preview: NodePreviewModel;
  brief?: PlaceBrief | null;
  draftDayLabelKo?: string | null;
  recipe?: WorkspaceCapabilityRecipe;
}): WorkspaceCapabilityBundle {
  const recipe = input.recipe ?? "travel";
  const pool: Partial<
    Record<WorkspaceCapabilityCallout["kind"], WorkspaceCapabilityCallout>
  > = {};

  const insight = buildInsight(
    input.preview,
    input.brief,
    input.draftDayLabelKo,
  );
  if (insight) pool.insight = insight;
  const price = buildPrice(input.preview);
  if (price) pool.price = price;
  const review = buildReview(input.preview);
  if (review) pool.review = review;
  const nearby = buildNearby(input.preview);
  if (nearby) pool.nearby = nearby;
  const day = buildDay(input.draftDayLabelKo);
  if (day) pool.day = day;
  const action = buildAction(input.preview);
  if (action) pool.action = action;

  const callouts: WorkspaceCapabilityCallout[] = [];
  for (const kind of RECIPE_ORDER[recipe]) {
    const c = pool[kind];
    if (c) callouts.push(c);
    if (callouts.length >= MAX_CALLOUTS) break;
  }

  return {
    callouts,
    liveSignals: buildWorkspaceLiveSignals({
      preview: input.preview,
      brief: input.brief,
      draftDayLabelKo: input.draftDayLabelKo,
    }),
  };
}
