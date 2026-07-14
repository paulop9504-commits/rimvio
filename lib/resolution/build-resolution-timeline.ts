import {
  RESOLUTION_PHASES,
  type ResolutionBundle,
  type ResolutionPhase,
  type ResolutionPhaseStatus,
} from "@/lib/resolution/types";
import {
  RESOLUTION_PHASE_DONE_KO,
  RESOLUTION_PHASE_TITLE_KO,
  resolutionProgressKo,
} from "@/lib/resolution/progress-copy";
import { projectResolutionBundleAtPhase } from "@/lib/resolution/run-resolution-pipeline";

export type ResolutionTimelineLaneRow = {
  id: ResolutionPhase;
  titleKo: string;
  status: ResolutionPhaseStatus;
  detailKo: string;
};

export type ResolutionTimelineSnapshot = {
  currentPhase: ResolutionPhase;
  waitingApproval: boolean;
  lanes: readonly ResolutionTimelineLaneRow[];
};

/**
 * Execution Timeline from Resolution Bundle (8 lanes).
 */
export function buildResolutionTimeline(
  bundle: ResolutionBundle,
  atPhase?: ResolutionPhase,
): ResolutionTimelineSnapshot {
  const projected = atPhase
    ? projectResolutionBundleAtPhase(bundle, atPhase)
    : bundle;

  const lanes: ResolutionTimelineLaneRow[] = RESOLUTION_PHASES.map((phase) => {
    const row = projected.phases[phase];
    let detailKo = row.progressKo;
    if (row.status === "pending") {
      detailKo = "대기 중";
    } else if (row.status === "done") {
      detailKo = RESOLUTION_PHASE_DONE_KO[phase];
    } else if (row.status === "in_progress") {
      detailKo = resolutionProgressKo(phase);
    } else if (row.status === "waiting") {
      detailKo = "사용자 승인을 기다리는 중...";
    }

    return {
      id: phase,
      titleKo: RESOLUTION_PHASE_TITLE_KO[phase],
      status: row.status,
      detailKo,
    };
  });

  return {
    currentPhase: projected.currentPhase,
    waitingApproval: projected.waitingApproval,
    lanes,
  };
}
