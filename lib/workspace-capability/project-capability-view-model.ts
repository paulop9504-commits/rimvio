/**
 * Project Workspace state → capability panel view models (no LLM).
 */

import type { ContextWorkspaceNode, ContextWorkspaceState } from "@/lib/context-workspace/types";
import type { WorkspaceCapabilityLayout } from "@/lib/workspace-capability/types";
import { isCapabilityOpen } from "@/lib/workspace-capability/apply-capability-op";

export type CapabilityDayCard = {
  readonly day: number;
  readonly labelKo: string;
  readonly lineKo: string;
  readonly placeCount: number;
  readonly themeKo: string;
  readonly accent: string;
};

export type CapabilityTimelineRow = {
  readonly nodeId: string;
  readonly title: string;
  readonly summaryKo: string;
  readonly kind: ContextWorkspaceNode["kind"];
  readonly amountLabel: string | null;
};

export type CapabilityBudgetRollup = {
  readonly labelKo: string;
  readonly placeCount: number;
  readonly withPrice: number;
  readonly sampleLabels: readonly string[];
};

export type CapabilityBookingChip = {
  readonly nodeId: string;
  readonly title: string;
  readonly amountLabel: string | null;
  readonly kind: ContextWorkspaceNode["kind"];
};

export type WorkspaceCapabilityViewModel = {
  readonly intentId: WorkspaceCapabilityLayout["intentId"];
  readonly focusedDay: number | null;
  readonly days: readonly CapabilityDayCard[];
  readonly timeline: readonly CapabilityTimelineRow[];
  readonly budget: CapabilityBudgetRollup;
  readonly bookings: readonly CapabilityBookingChip[];
  readonly overviewLineKo: string;
  readonly decisionLineKo: string;
};

const DAY_ACCENTS = [
  "#3182f6",
  "#f97316",
  "#22c55e",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
] as const;

function nodesForDay(
  state: ContextWorkspaceState,
  day: number,
): readonly ContextWorkspaceNode[] {
  const draftDay = state.realityDraft?.days.find((d) => d.day === day);
  if (draftDay) {
    const ids = new Set(draftDay.nodes.map((n) => n.nodeId));
    return state.nodes.filter((n) => n.visible && ids.has(n.id));
  }
  // Chunk visible nodes when draft is absent.
  const visible = state.nodes.filter((n) => n.visible);
  const dayCount = Math.max(1, state.realityDraft?.days.length ?? 5);
  const size = Math.ceil(visible.length / dayCount) || 1;
  const start = (day - 1) * size;
  return visible.slice(start, start + size);
}

export function buildWorkspaceCapabilityViewModel(input: {
  readonly state: ContextWorkspaceState;
  readonly layout: WorkspaceCapabilityLayout;
}): WorkspaceCapabilityViewModel {
  const { state, layout } = input;
  const draftDays = state.realityDraft?.days ?? [];

  const days: CapabilityDayCard[] =
    draftDays.length > 0
      ? draftDays.map((d) => ({
          day: d.day,
          labelKo: d.labelKo || `Day ${d.day}`,
          lineKo: d.lineKo,
          placeCount: d.nodes.length,
          themeKo: d.emoji ? `${d.emoji} ${d.labelKo}` : d.labelKo,
          accent: DAY_ACCENTS[(d.day - 1) % DAY_ACCENTS.length]!,
        }))
      : Array.from({ length: 5 }, (_, i) => {
          const day = i + 1;
          const nodes = nodesForDay(state, day);
          return {
            day,
            labelKo: `Day ${day}`,
            lineKo: nodes.map((n) => n.title).join(" → ") || "빈 일정",
            placeCount: nodes.length,
            themeKo: `Day ${day}`,
            accent: DAY_ACCENTS[i % DAY_ACCENTS.length]!,
          };
        });

  const focusDay = layout.focusedDay ?? days[0]?.day ?? 1;
  const dayNodes = nodesForDay(state, focusDay);
  const timeline: CapabilityTimelineRow[] = dayNodes.map((n) => ({
    nodeId: n.id,
    title: n.title,
    summaryKo: n.summaryKo,
    kind: n.kind,
    amountLabel: n.amountLabel,
  }));

  const visible = state.nodes.filter((n) => n.visible);
  const priced = visible.filter((n) => Boolean(n.amountLabel?.trim()));
  const budget: CapabilityBudgetRollup = {
    labelKo: priced.length
      ? `가격 표기 ${priced.length}곳`
      : "예산 집계 준비 중",
    placeCount: visible.length,
    withPrice: priced.length,
    sampleLabels: priced
      .slice(0, 4)
      .map((n) => n.amountLabel!.trim())
      .filter(Boolean),
  };

  const bookings: CapabilityBookingChip[] = visible
    .filter(
      (n) =>
        n.kind === "lodging" ||
        n.tags.includes("reservable") ||
        /예약|ticket|티켓/iu.test(`${n.title} ${n.tags.join(" ")}`),
    )
    .slice(0, 6)
    .map((n) => ({
      nodeId: n.id,
      title: n.title,
      amountLabel: n.amountLabel,
      kind: n.kind,
    }));

  const overviewLineKo =
    state.realityDraft?.stayLabelKo && state.realityDraft.destinationKo
      ? `${state.realityDraft.destinationKo} · ${state.realityDraft.stayLabelKo} · ${visible.length}곳`
      : `${state.summaryKo || state.query || "작업장"} · ${visible.length}곳`;

  const decisionLineKo =
    dayNodes[0] != null
      ? `지금 포커스 · ${dayNodes[0].title}`
      : "후보를 고르면 Decision이 열려요";

  return {
    intentId: layout.intentId,
    focusedDay: focusDay,
    days,
    timeline,
    budget,
    bookings,
    overviewLineKo,
    decisionLineKo,
  };
}

export function capabilityChromeNeeded(
  layout: WorkspaceCapabilityLayout | null,
): boolean {
  if (!layout) return false;
  return (
    isCapabilityOpen(layout, "day_rail") ||
    isCapabilityOpen(layout, "timeline") ||
    isCapabilityOpen(layout, "trip_overview") ||
    isCapabilityOpen(layout, "candidate_list") ||
    isCapabilityOpen(layout, "booking") ||
    isCapabilityOpen(layout, "members")
  );
}
