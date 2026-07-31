/**
 * Chat ↔ Workspace sync — AI text becomes Workspace objects (ADR-022 / UX law).
 * Patch strip + Object Cards share nodeId with the map SSOT — no duplicate stores.
 * Trip create prefers Context Brief over Day1 essay.
 */

import { buildContextBrief } from "@/lib/context-workspace/context-brief/build-context-brief";
import type { ContextBrief } from "@/lib/context-workspace/context-brief/types";
import type { RealityDraft } from "@/lib/context-workspace/reality-draft";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import {
  appendWorkspaceChatTurn,
  type WorkspaceChatObjectCard,
  type WorkspaceChatPatchStrip,
  type WorkspaceChatTurn,
} from "@/lib/context-workspace/workspace-chat-store";
import { readGoalSupervisor } from "@/lib/workstream/goal-supervisor";
import { copy } from "@/lib/copy/human-ko";

function countByKind(
  nodes: readonly ContextWorkspaceNode[],
  kind: ContextWorkspaceNode["kind"],
): number {
  return nodes.filter((n) => n.visible && n.kind === kind).length;
}

export function buildWorkspacePatchStrip(
  state: ContextWorkspaceState,
): WorkspaceChatPatchStrip {
  const lodging = countByKind(state.nodes, "lodging");
  const poi = countByKind(state.nodes, "poi");
  const eatery = countByKind(state.nodes, "eatery");
  const parts: string[] = ["Workspace patch"];
  if (lodging > 0) parts.push(`+숙소 ${lodging}`);
  if (poi > 0) parts.push(`+POI ${poi}`);
  if (eatery > 0) parts.push(`+맛집 ${eatery}`);
  if (state.nodes.filter((n) => n.visible).length >= 2) {
    parts.push("Route 갱신");
  }
  return {
    summaryKo: parts.join(" · "),
    lodgingDelta: lodging,
    poiDelta: poi,
    eateryDelta: eatery,
    routeUpdated: state.nodes.filter((n) => n.visible).length >= 2,
  };
}

export function buildWorkspaceObjectCards(
  state: ContextWorkspaceState,
  limit = 4,
): readonly WorkspaceChatObjectCard[] {
  const visible = state.nodes.filter((n) => n.visible);
  const preferred = [
    ...visible.filter((n) => n.kind === "lodging"),
    ...visible.filter((n) => n.kind === "poi"),
    ...visible.filter((n) => n.kind === "eatery"),
  ];
  const seen = new Set<string>();
  const cards: WorkspaceChatObjectCard[] = [];
  for (const node of preferred) {
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    const dayHint =
      node.tags.includes("anchor") || /파크스|난바\s*파크/u.test(node.title)
        ? "Day1 · 앵커"
        : node.kind === "lodging"
          ? "숙소 · 후보"
          : node.kind === "eatery"
            ? "맛집"
            : node.summaryKo.includes("분")
              ? node.summaryKo
              : "일정";
    cards.push({
      nodeId: node.id,
      title: node.title,
      subtitleKo: dayHint,
      kind: node.kind,
      ctaKo: node.kind === "lodging" ? "Workspace →" : "지도 보기 →",
    });
    if (cards.length >= limit) break;
  }
  return cards;
}

/** Simple day plan lines for trip draft chat (One Focus — not a second itinerary SSOT). */
export function buildTripDayPlanLines(
  state: ContextWorkspaceState,
): readonly string[] {
  const pois = state.nodes.filter((n) => n.visible && n.kind === "poi");
  if (pois.length === 0) return [];
  const lines: string[] = [];
  const labels = ["Day1", "Day2", "Day3", "Day4", "Day5"];
  for (let i = 0; i < Math.min(pois.length, 5); i += 1) {
    lines.push(`${labels[i]} ${pois[i]!.title}`);
  }
  if (lines.length > 0 && lines.length < 5) {
    lines.push("Day5 귀국");
  }
  return lines.slice(0, 5);
}

/**
 * After Workspace mutates — append assistant turn that mirrors objects into chat.
 * When `includeContextBrief` (default for trip day plan), emit Brief instead of Day essay.
 */
export function appendWorkspaceSyncedAssistantTurn(input: {
  readonly contextEventId: string;
  readonly state: ContextWorkspaceState;
  readonly textKo?: string | null;
  /** @deprecated Prefer Context Brief — kept for tests that assert Day lines. */
  readonly includeDayPlan?: boolean;
  readonly includeContextBrief?: boolean;
  readonly contextBrief?: ContextBrief | null;
  readonly realityDraft?: RealityDraft | null;
}): WorkspaceChatTurn | null {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) return null;

  const patch = buildWorkspacePatchStrip(input.state);
  const objects = buildWorkspaceObjectCards(input.state);
  const realityDraft =
    input.realityDraft ?? input.state.realityDraft ?? null;
  const wantBrief =
    input.includeContextBrief === true ||
    (input.includeContextBrief !== false &&
      (input.includeDayPlan === true ||
        input.contextBrief != null ||
        realityDraft != null));
  const contextBrief =
    input.contextBrief ??
    (wantBrief ? buildContextBrief(input.state) : null);
  const dayPlanLines =
    !contextBrief && !realityDraft && input.includeDayPlan
      ? buildTripDayPlanLines(input.state)
      : [];
  const supervisor = readGoalSupervisor({ contextEventId });
  const goalLine = supervisor
    ? `${supervisor.goalKo} · ${supervisor.percent}%`
    : null;

  const body = realityDraft
    ? input.textKo?.trim() ||
      copy.globe.realityDraftCreatedLine(
        realityDraft.contextTitleKo,
        realityDraft.days.length,
      )
    : contextBrief
      ? input.textKo?.trim() ||
        copy.globe.contextBriefCreatedLine(
          contextBrief.titleKo,
          contextBrief.roles.length,
        )
      : input.textKo?.trim() ||
        [
          goalLine ? `${goalLine} — 여행 Context를 만들었어요.` : null,
          "항공·숙소·일정을 Workspace에 동시에 준비했어요.",
          dayPlanLines.length > 0 ? "" : null,
          ...dayPlanLines,
        ]
          .filter((line) => line != null)
          .join("\n")
          .trim();

  return appendWorkspaceChatTurn({
    contextEventId,
    role: "assistant",
    text: body,
    patch,
    objects,
    dayPlanLines,
    contextBrief,
    realityDraft,
    showLinkedWorkCta: true,
  });
}
