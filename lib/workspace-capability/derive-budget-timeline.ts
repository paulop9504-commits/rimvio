/**
 * P6 — Budget / Timeline derived projection from Workspace SSOT.
 * No parallel money store — nodes + ConstraintMemory + Reality Draft only.
 */

import type {
  ContextWorkspaceNode,
  ContextWorkspaceState,
} from "@/lib/context-workspace/types";
import { resolveStayNights } from "@/lib/unit-canon/lodging-money";

/** Parse 「₩12만」「120,000원」「12만원」→ KRW nightly guess. */
export function parseAmountLabelKrw(label: string | null | undefined): number | null {
  const raw = label?.trim();
  if (!raw) return null;
  const man = raw.match(/(\d+(?:\.\d+)?)\s*만/u);
  if (man?.[1]) {
    const n = Number(man[1]);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 10_000) : null;
  }
  const digits = raw.replace(/[^\d]/gu, "");
  if (digits.length >= 4) {
    const n = Number(digits);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function dayTag(node: ContextWorkspaceNode): number | null {
  for (const t of node.tags) {
    const m = /^day:(\d+)$/iu.exec(t.trim());
    if (m?.[1]) {
      const d = Number(m[1]);
      if (Number.isFinite(d) && d >= 1 && d <= 30) return d;
    }
  }
  return null;
}

/**
 * Timeline nodes for a day — prefer day:N tags, then Reality Draft, then chunk.
 */
export function nodesForCapabilityDay(
  state: ContextWorkspaceState,
  day: number,
): readonly ContextWorkspaceNode[] {
  const tagged = state.nodes.filter(
    (n) => n.visible && dayTag(n) === day,
  );
  if (tagged.length > 0) return tagged;

  const draftDay = state.realityDraft?.days.find((d) => d.day === day);
  if (draftDay && draftDay.nodes.length > 0) {
    const ids = new Set(draftDay.nodes.map((n) => n.nodeId));
    const fromDraft = state.nodes.filter((n) => n.visible && ids.has(n.id));
    if (fromDraft.length > 0) return fromDraft;
  }

  const routeOrdered = (state.relationshipEdges ?? [])
    .filter((e) => e.kind === "route" || e.kind === "schedule")
    .flatMap((e) => [e.fromNodeId, e.toNodeId]);
  if (routeOrdered.length > 0) {
    const byId = new Map(state.nodes.map((n) => [n.id, n] as const));
    const seen = new Set<string>();
    const ordered: ContextWorkspaceNode[] = [];
    for (const id of routeOrdered) {
      if (seen.has(id)) continue;
      const n = byId.get(id);
      if (n?.visible && (dayTag(n) === day || dayTag(n) == null)) {
        seen.add(id);
        ordered.push(n);
      }
    }
    if (ordered.length > 0) {
      const dayCount = Math.max(1, state.realityDraft?.days.length ?? 3);
      const size = Math.ceil(ordered.length / dayCount) || 1;
      const start = (day - 1) * size;
      return ordered.slice(start, start + size);
    }
  }

  const visible = state.nodes.filter((n) => n.visible);
  const dayCount = Math.max(1, state.realityDraft?.days.length ?? 5);
  const size = Math.ceil(visible.length / dayCount) || 1;
  const start = (day - 1) * size;
  return visible.slice(start, start + size);
}

export type DerivedBudgetRollup = {
  readonly labelKo: string;
  readonly placeCount: number;
  readonly withPrice: number;
  readonly sampleLabels: readonly string[];
  readonly nightlySumKrw: number | null;
  readonly stayEstimateKrw: number | null;
  readonly nights: number;
  readonly maxNightlyCapKrw: number | null;
  readonly overBudget: boolean;
};

export function deriveBudgetRollup(
  state: ContextWorkspaceState,
): DerivedBudgetRollup {
  const visible = state.nodes.filter((n) => n.visible);
  const lodging = visible.filter((n) => n.kind === "lodging");
  const priced = visible.filter((n) => Boolean(n.amountLabel?.trim()));
  const nights = resolveStayNights({
    nights: null,
    checkInIso: null,
    checkOutIso: null,
  });
  // Prefer Reality Draft stay length via stay label 「3박」.
  const stayLabel = state.realityDraft?.stayLabelKo ?? "";
  const nightsFromLabel = stayLabel.match(/(\d+)\s*박/u)?.[1];
  const stayNights = nightsFromLabel
    ? Math.max(1, Number(nightsFromLabel))
    : nights;

  const nightlyValues: number[] = [];
  for (const n of lodging.length > 0 ? lodging : priced) {
    const krw = parseAmountLabelKrw(n.amountLabel);
    if (krw != null) nightlyValues.push(krw);
  }

  const nightlySum =
    nightlyValues.length > 0
      ? nightlyValues.reduce((a, b) => a + b, 0)
      : null;
  const stayEstimate =
    nightlySum != null ? nightlySum * stayNights : null;
  const cap = state.constraintMemory?.maxNightlyPriceKrw ?? null;
  const overBudget =
    cap != null &&
    nightlyValues.some((v) => v > cap);

  let labelKo: string;
  if (nightlySum != null && stayNights > 1) {
    labelKo = `숙소 합 ${Math.round(nightlySum / 10_000)}만/박 · ${stayNights}박 ≈ ${Math.round((stayEstimate ?? 0) / 10_000)}만`;
  } else if (nightlySum != null) {
    labelKo = `숙소 합 ${Math.round(nightlySum / 10_000)}만원/박`;
  } else if (priced.length > 0) {
    labelKo = `가격 표기 ${priced.length}곳`;
  } else {
    labelKo = "예산 집계 준비 중";
  }
  if (overBudget && cap != null) {
    labelKo = `${labelKo} · 상한 ${Math.round(cap / 10_000)}만 초과`;
  }

  return {
    labelKo,
    placeCount: visible.length,
    withPrice: priced.length,
    sampleLabels: priced
      .slice(0, 4)
      .map((n) => n.amountLabel!.trim())
      .filter(Boolean),
    nightlySumKrw: nightlySum,
    stayEstimateKrw: stayEstimate,
    nights: stayNights,
    maxNightlyCapKrw: cap,
    overBudget,
  };
}
