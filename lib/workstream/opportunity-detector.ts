/**
 * Opportunity Detector — find value the user did not ask for (ADR-046).
 * World State watch/alert → optional new Task nodes (not a parallel Runtime).
 */

import type { ContextTaskNode } from "@/lib/workstream/build-context-task-graph";
import {
  readWorldState,
  type WorldSignal,
  type WorldState,
} from "@/lib/workstream/world-state";

export type DetectedOpportunity = {
  readonly id: string;
  readonly titleKo: string;
  readonly reasonKo: string;
  readonly sourceSignalId: string;
  readonly severity: WorldSignal["severity"];
  /** Suggested Task Graph node (pending). */
  readonly task: ContextTaskNode;
};

function taskFromSignal(
  signal: WorldSignal,
  order: number,
): DetectedOpportunity | null {
  if (signal.severity === "info") return null;
  const hint = signal.hint?.trim() || signal.id;

  if (hint === "usj_discount" || /USJ|유니버설/i.test(signal.labelKo)) {
    return {
      id: `opp:${hint}`,
      titleKo: "USJ 할인 티켓 검토",
      reasonKo: signal.detailKo,
      sourceSignalId: signal.id,
      severity: signal.severity,
      task: {
        id: "opp-usj-discount",
        labelKo: "USJ 할인 이벤트 반영",
        status: "pending",
        order,
      },
    };
  }

  if (hint === "flight_price_drop" || signal.kind === "price") {
    return {
      id: `opp:${hint}`,
      titleKo: "항공권 가격 재검색",
      reasonKo: signal.detailKo,
      sourceSignalId: signal.id,
      severity: signal.severity,
      task: {
        id: "opp-flight-price",
        labelKo: "항공권 급락 — 재검색",
        status: "pending",
        order,
      },
    };
  }

  if (hint === "typhoon_reschedule" || signal.severity === "alert") {
    return {
      id: `opp:${hint}`,
      titleKo: "기상 영향 일정 재배치",
      reasonKo: signal.detailKo,
      sourceSignalId: signal.id,
      severity: signal.severity,
      task: {
        id: "opp-weather-reschedule",
        labelKo: "태풍·기상 — 일정 자동 수정 검토",
        status: "pending",
        order,
      },
    };
  }

  if (signal.kind === "event" && signal.severity === "watch") {
    return {
      id: `opp:event:${signal.id}`,
      titleKo: signal.labelKo,
      reasonKo: signal.detailKo,
      sourceSignalId: signal.id,
      severity: signal.severity,
      task: {
        id: `opp-event-${signal.id}`,
        labelKo: `${signal.labelKo} 반영`,
        status: "pending",
        order,
      },
    };
  }

  return null;
}

/**
 * Scan World State for opportunities → new pending Tasks.
 */
export function detectOpportunities(input: {
  readonly contextEventId: string;
  readonly world?: WorldState | null;
  readonly startOrder?: number;
}): readonly DetectedOpportunity[] {
  const world =
    input.world ?? readWorldState(input.contextEventId.trim()) ?? null;
  if (!world) return [];
  const start = input.startOrder ?? 100;
  const out: DetectedOpportunity[] = [];
  let i = 0;
  for (const signal of world.signals) {
    const opp = taskFromSignal(signal, start + i);
    if (opp) {
      out.push(opp);
      i += 1;
    }
  }
  return out;
}

export function formatOpportunitiesBrief(
  opps: readonly DetectedOpportunity[],
): string {
  if (opps.length === 0) return "Opportunities: (none)";
  return [
    "Opportunities:",
    ...opps.map((o) => `  · ${o.titleKo} — ${o.reasonKo}`),
  ].join("\n");
}
