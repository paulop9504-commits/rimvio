/**
 * Project Workspace state → capability panel view models (no LLM).
 * P6: Budget/Timeline derived from nodes + ConstraintMemory + Reality Draft.
 */

import type { ContextWorkspaceNode, ContextWorkspaceState } from "@/lib/context-workspace/types";
import type { WorkspaceCapabilityLayout } from "@/lib/workspace-capability/types";
import { isCapabilityOpen } from "@/lib/workspace-capability/apply-capability-op";
import {
  deriveBudgetRollup,
  nodesForCapabilityDay,
} from "@/lib/workspace-capability/derive-budget-timeline";
import { copy } from "@/lib/copy/human-ko";

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
  readonly rating: number | null;
  readonly reviewCount: number | null;
  readonly thumbnailUrl: string | null;
  readonly kindLabelKo: string;
  readonly timeOfDayKo: string;
  readonly lat: number;
  readonly lng: number;
};

export type CapabilityBudgetRollup = {
  readonly labelKo: string;
  readonly placeCount: number;
  readonly withPrice: number;
  readonly sampleLabels: readonly string[];
  readonly nightlySumKrw?: number | null;
  readonly stayEstimateKrw?: number | null;
  readonly nights?: number;
  readonly maxNightlyCapKrw?: number | null;
  readonly overBudget?: boolean;
};

export type CapabilityBookingChip = {
  readonly nodeId: string;
  readonly title: string;
  readonly amountLabel: string | null;
  readonly kind: ContextWorkspaceNode["kind"];
  /** lodging · flight · ticket — never cafe/eatery. */
  readonly bookableRoleKo: "숙소" | "항공" | "티켓";
  readonly ctaKo: "예약하기" | "준비";
};

/** Search/info places — cafes, eateries, POIs (not booking panel). */
export type CapabilityDiscoverPlace = {
  readonly nodeId: string;
  readonly title: string;
  readonly summaryKo: string;
  readonly kind: ContextWorkspaceNode["kind"];
  readonly kindLabelKo: string;
  readonly amountLabel: string | null;
  readonly rating: number | null;
  readonly thumbnailUrl: string | null;
};

export type WorkspaceCapabilityViewModel = {
  readonly intentId: WorkspaceCapabilityLayout["intentId"];
  readonly focusedDay: number | null;
  readonly days: readonly CapabilityDayCard[];
  readonly timeline: readonly CapabilityTimelineRow[];
  readonly budget: CapabilityBudgetRollup;
  readonly bookings: readonly CapabilityBookingChip[];
  readonly discoverPlaces: readonly CapabilityDiscoverPlace[];
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

function nodeBlob(n: ContextWorkspaceNode): string {
  return `${n.title} ${n.placeId} ${n.tags.join(" ")}`;
}

/**
 * Booking panel only: lodging · flight/항공 · ticket/티켓.
 * Cafes / eateries stay in discover even if tagged reservable.
 */
export function isCapabilityBookableNode(n: ContextWorkspaceNode): boolean {
  if (n.kind === "eatery") return false;
  if (n.kind === "lodging") return true;
  const blob = nodeBlob(n);
  if (
    n.kind === "amenity" &&
    /flight|airport|항공|arrival|kix|airport/iu.test(blob)
  ) {
    return true;
  }
  if (/ticket|티켓|theme_park|usj|유니버설/iu.test(blob)) {
    return true;
  }
  return false;
}

export function bookableRoleKoForNode(
  n: ContextWorkspaceNode,
): CapabilityBookingChip["bookableRoleKo"] {
  if (n.kind === "lodging") return "숙소";
  const blob = nodeBlob(n);
  if (/ticket|티켓|theme_park|usj|유니버설/iu.test(blob)) return "티켓";
  return "항공";
}

export function isCapabilityDiscoverPlaceNode(n: ContextWorkspaceNode): boolean {
  if (!n.visible) return false;
  if (isCapabilityBookableNode(n)) return false;
  return n.kind === "eatery" || n.kind === "poi" || n.kind === "amenity";
}

function discoverKindLabelKo(n: ContextWorkspaceNode): string {
  if (n.kind === "eatery") {
    if (/카페|cafe|coffee/iu.test(nodeBlob(n))) return "카페";
    return "맛집";
  }
  if (n.kind === "poi") return "장소";
  return "편의";
}

function timeOfDayKoForIndex(index: number, total: number): string {
  if (total <= 1) return copy.globe.itineraryMorning;
  const ratio = index / Math.max(total - 1, 1);
  if (ratio < 0.34) return copy.globe.itineraryMorning;
  if (ratio < 0.67) return copy.globe.itineraryAfternoon;
  return copy.globe.itineraryEvening;
}

export function buildWorkspaceCapabilityViewModel(input: {
  readonly state: ContextWorkspaceState;
  readonly layout: WorkspaceCapabilityLayout;
}): WorkspaceCapabilityViewModel {
  const { state, layout } = input;
  const draftDays = state.realityDraft?.days ?? [];

  const days: CapabilityDayCard[] =
    draftDays.length > 0
      ? draftDays.map((d) => {
          const dayNodes = nodesForCapabilityDay(state, d.day);
          return {
            day: d.day,
            labelKo: d.labelKo || `Day ${d.day}`,
            lineKo:
              dayNodes.map((n) => n.title).join(" → ") ||
              d.lineKo ||
              "빈 일정",
            placeCount: dayNodes.length || d.nodes.length,
            themeKo: d.emoji ? `${d.emoji} ${d.labelKo}` : d.labelKo,
            accent: DAY_ACCENTS[(d.day - 1) % DAY_ACCENTS.length]!,
          };
        })
      : Array.from({ length: 5 }, (_, i) => {
          const day = i + 1;
          const nodes = nodesForCapabilityDay(state, day);
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
  const dayNodes = nodesForCapabilityDay(state, focusDay);
  const timeline: CapabilityTimelineRow[] = dayNodes.map((n, index) => ({
    nodeId: n.id,
    title: n.title,
    summaryKo: n.summaryKo,
    kind: n.kind,
    amountLabel: n.amountLabel,
    rating: n.rating,
    reviewCount: n.reviewCount ?? null,
    thumbnailUrl: n.thumbnailUrl,
    kindLabelKo: discoverKindLabelKo(n),
    timeOfDayKo: timeOfDayKoForIndex(index, dayNodes.length),
    lat: n.lat,
    lng: n.lng,
  }));

  const derived = deriveBudgetRollup(state);
  const budget: CapabilityBudgetRollup = {
    labelKo: derived.labelKo,
    placeCount: derived.placeCount,
    withPrice: derived.withPrice,
    sampleLabels: derived.sampleLabels,
    nightlySumKrw: derived.nightlySumKrw,
    stayEstimateKrw: derived.stayEstimateKrw,
    nights: derived.nights,
    maxNightlyCapKrw: derived.maxNightlyCapKrw,
    overBudget: derived.overBudget,
  };

  const visible = state.nodes.filter((n) => n.visible);

  const bookings: CapabilityBookingChip[] = visible
    .filter(isCapabilityBookableNode)
    .slice(0, 8)
    .map((n) => {
      const amount = n.amountLabel?.trim() || null;
      const pricedAmt = Boolean(amount) && /[₩￥$€\d]/u.test(amount!);
      return {
        nodeId: n.id,
        title: n.title,
        amountLabel: amount,
        kind: n.kind,
        bookableRoleKo: bookableRoleKoForNode(n),
        ctaKo: pricedAmt || n.liteapiOfferId ? "예약하기" : "준비",
      };
    });

  const discoverPlaces: CapabilityDiscoverPlace[] = visible
    .filter(isCapabilityDiscoverPlaceNode)
    .slice(0, 12)
    .map((n) => ({
      nodeId: n.id,
      title: n.title,
      summaryKo: n.summaryKo,
      kind: n.kind,
      kindLabelKo: discoverKindLabelKo(n),
      amountLabel: n.amountLabel,
      rating: n.rating,
      thumbnailUrl: n.thumbnailUrl,
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
    discoverPlaces,
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
    isCapabilityOpen(layout, "budget") ||
    isCapabilityOpen(layout, "trip_overview") ||
    isCapabilityOpen(layout, "candidate_list") ||
    isCapabilityOpen(layout, "booking") ||
    isCapabilityOpen(layout, "members")
  );
}
