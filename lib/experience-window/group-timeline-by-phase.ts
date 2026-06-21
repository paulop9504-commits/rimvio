import type { ExperienceBridgeTimelineItem } from "@/lib/experience-bridge/experience-bridge-types";
import type { ExperiencePhase } from "@/lib/experience-window/experience-window-types";

export type ExperienceTimelinePhaseGroup = {
  phase: ExperiencePhase;
  items: ExperienceBridgeTimelineItem[];
};

const PHASE_ORDER: ExperiencePhase[] = ["prep", "live", "recall", "outside"];

function isRenderablePhase(phase: ExperiencePhase): boolean {
  return phase !== "outside";
}

/** Group merged bridge timeline rows by experience phase (prep → live → recall). */
export function groupBridgeTimelineByPhase(
  items: readonly ExperienceBridgeTimelineItem[],
): ExperienceTimelinePhaseGroup[] {
  const buckets = new Map<ExperiencePhase, ExperienceBridgeTimelineItem[]>();

  for (const row of items) {
    const phase = row.phase ?? "outside";
    if (!isRenderablePhase(phase)) {
      continue;
    }
    const list = buckets.get(phase) ?? [];
    list.push(row);
    buckets.set(phase, list);
  }

  return PHASE_ORDER.filter((phase) => buckets.has(phase)).map((phase) => ({
    phase,
    items: buckets.get(phase)!,
  }));
}

export function isBridgeTimelineMediaKind(
  kind: ExperienceBridgeTimelineItem["kind"],
): boolean {
  return (
    kind === "photo" ||
    kind === "video" ||
    kind === "shared_pin_photo" ||
    kind === "shared_pin_video"
  );
}
