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
  const byEngine = copy.globe.engineEventTimeline[event.engineId];
  if (!byEngine) {
    return null;
  }
  return byEngine[event.kind] ?? null;
}

export function engineEventPriority(event: RimvioEngineEventV1): number {
  switch (event.kind) {
    case "main_selected":
      return 0;
    case "scout_failed":
      return 1;
    case "scout_complete":
      return 2;
    default:
      return 5;
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
