import { copy } from "@/lib/copy/human-ko";
import type {
  ItineraryDiff,
  ExperienceScenarioNode,
  ExperienceScenarioNodeStatus,
} from "@/lib/globe/experience-simulation/types";
import type { ScenarioPlaceCandidate } from "@/lib/globe/experience-simulation/order-scenario-nodes";
import {
  estimateWalkMinutes,
  resolveDwellMinutes,
} from "@/lib/globe/experience-simulation/order-scenario-nodes";

export function scheduleScenarioNodes(input: {
  anchor: {
    title: string;
    lat: number;
    lng: number;
  };
  ordered: readonly ScenarioPlaceCandidate[];
  startAt?: Date;
  cursorIndex?: number;
}): ExperienceScenarioNode[] {
  const startAt = input.startAt ?? new Date();
  let cursorMs = startAt.getTime();
  let prev = { lat: input.anchor.lat, lng: input.anchor.lng };
  const cursorIndex = input.cursorIndex ?? 0;

  return input.ordered.map((row, index) => {
    const travelMin = estimateWalkMinutes(prev, row);
    cursorMs += travelMin * 60_000;
    const scheduledAtIso = new Date(cursorMs).toISOString();
    const dwellMin = resolveDwellMinutes(row.resourceKind);
    let status: ExperienceScenarioNodeStatus = "pending";
    if (index < cursorIndex) {
      status = "done";
    } else if (index === cursorIndex) {
      status = "active";
    }
    prev = row;
    cursorMs += dwellMin * 60_000;
    return {
      id: `scenario-node:${row.placeId}`,
      placeId: row.placeId,
      kind: "place",
      resourceKind: row.resourceKind,
      title: row.title,
      lat: row.lat,
      lng: row.lng,
      rank: row.rank,
      travelMinFromPrev: travelMin,
      dwellMin,
      scheduledAtIso,
      status,
    };
  });
}

/** Cursor-style itinerary patch — node id sequences before/after. */
export function diffItinerary(
  before: readonly string[],
  after: readonly string[],
): ItineraryDiff {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const kept = after.filter((id) => beforeSet.has(id));
  const inserted = after.filter((id) => !beforeSet.has(id));
  const removed = before.filter((id) => !afterSet.has(id));
  const reordered =
    before.length === after.length &&
    before.some((id, index) => id !== after[index]);

  let summaryKo = copy.globe.experienceSimDiffNone;
  if (inserted.length > 0 && removed.length === 0) {
    summaryKo = copy.globe.experienceSimDiffInsert(inserted.length);
  } else if (removed.length > 0 && inserted.length === 0) {
    summaryKo = copy.globe.experienceSimDiffRemove(removed.length);
  } else if (reordered) {
    summaryKo = copy.globe.experienceSimDiffReorder;
  } else if (inserted.length > 0 || removed.length > 0) {
    summaryKo = copy.globe.experienceSimDiffPatch;
  }

  return { kept, inserted, removed, reordered, summaryKo };
}

export function formatScenarioTimeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
