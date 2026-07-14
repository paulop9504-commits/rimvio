/**
 * User-facing Engine lifecycle timeline labels (L1).
 * @see docs/RIMVIO_ENGINE.md — contextEngineEventsV1
 */

import { copy } from "@/lib/copy/human-ko";
import type { RimvioEngineEventV1 } from "@/lib/engine/engine-event-metadata";

export type EngineEventTimelineRow = {
  id: string;
  labelKo: string;
  atIso: string;
};

function engineEventLabel(event: RimvioEngineEventV1): string | null {
  if (event.kind === "pass") {
    const to =
      typeof event.payload?.toEngineId === "string"
        ? event.payload.toEngineId
        : "";
    return to ? `패스 → ${to}` : "팀 패스";
  }
  if (event.kind === "assist") {
    return "어시스트";
  }
  if (event.kind === "field_ready") {
    return "맞춤으로 패스";
  }
  if (event.kind === "scout_insufficient") {
    return "후보 부족 — 재조합";
  }
  const byEngine = copy.globe.engineEventTimeline[event.engineId];
  if (!byEngine) {
    return null;
  }
  return (byEngine as Record<string, string | undefined>)[event.kind] ?? null;
}

export function engineEventPriority(event: RimvioEngineEventV1): number {
  switch (event.kind) {
    case "main_selected":
      return 0;
    case "field_ready":
      return 1;
    case "assist":
      return 2;
    case "scout_failed":
      return 3;
    case "scout_insufficient":
      return 4;
    case "scout_complete":
      return 5;
    case "pass":
      return 6;
    default:
      return 7;
  }
}

export function buildEngineEventTimelineRows(
  events: readonly RimvioEngineEventV1[],
  max = 4,
): EngineEventTimelineRow[] {
  return [...events]
    .filter((event) => engineEventLabel(event) != null)
    .sort((left, right) => {
      const priority = engineEventPriority(left) - engineEventPriority(right);
      if (priority !== 0) {
        return priority;
      }
      return right.atIso.localeCompare(left.atIso);
    })
    .slice(0, max)
    .map((event) => ({
      id: event.id,
      labelKo: engineEventLabel(event)!,
      atIso: event.atIso,
    }));
}
