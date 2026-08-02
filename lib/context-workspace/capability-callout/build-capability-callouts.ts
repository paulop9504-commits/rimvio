/**
 * Build ≤4 Capability Callouts for a Workspace place hub.
 * Empty capabilities are omitted — bloom stays sparse and clean.
 */

import type { NodePreviewModel } from "@/lib/context-workspace/build-node-preview";
import type { PlaceBrief } from "@/lib/context-workspace/place-brief/types";
import type {
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

function buildInsight(
  preview: NodePreviewModel,
  brief: PlaceBrief | null | undefined,
): WorkspaceCapabilityCallout | null {
  const lines = insightLines(preview, brief);
  if (lines.length === 0 && !brief?.introKo?.trim()) return null;
  const body =
    lines.length > 0
      ? lines
      : [brief!.introKo!.trim().slice(0, 80)];
  return {
    id: "insight",
    kind: "insight",
    labelKo: "AI 추천",
    valueKo: body[0]!.slice(0, 22),
    linesKo: body,
    confidence: body.length >= 3 ? 0.9 : body.length >= 2 ? 0.82 : 0.7,
    icon: "sparkle",
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
  const recipe = input.recipe ?? "travel";
  const pool: Partial<
    Record<WorkspaceCapabilityCallout["kind"], WorkspaceCapabilityCallout>
  > = {};

  const insight = buildInsight(input.preview, input.brief);
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

  const out: WorkspaceCapabilityCallout[] = [];
  for (const kind of RECIPE_ORDER[recipe]) {
    const c = pool[kind];
    if (c) out.push(c);
    if (out.length >= MAX_CALLOUTS) break;
  }
  return out;
}
