import type {
  BrainSurfaceCandidateFamily,
  BrainSurfaceProjectionCandidate,
} from "@/lib/situation-projection/brain-surface-types";

export type BrainSurfaceDisclosureStage = "core" | "related" | "detail";

const CORE_FAMILIES = new Set<BrainSurfaceCandidateFamily>([
  "media",
  "lodging",
  "eatery",
]);

export function resolveBrainSurfaceDisclosureStage(input: {
  activeCandidateId: string | null;
  shadowExpanded: boolean;
  detailMode: boolean;
  hasActiveNode: boolean;
}): BrainSurfaceDisclosureStage {
  if (input.detailMode && input.hasActiveNode) {
    return "detail";
  }
  if (input.shadowExpanded || input.activeCandidateId) {
    return "related";
  }
  return "core";
}

/** Stage 1 — one anchor per family (영상 · 숙소 · 맛집). */
export function isCoreBrainSurfaceCandidate(
  candidate: BrainSurfaceProjectionCandidate,
): boolean {
  if (candidate.anchorKind === "inferred_place") {
    return false;
  }
  if (candidate.family === "memo" || candidate.family === "info" || candidate.family === "event") {
    return false;
  }
  if (candidate.family === "trace_place") {
    return false;
  }
  if (candidate.anchorKind === "video_root") {
    return true;
  }
  return CORE_FAMILIES.has(candidate.family);
}

function preferCoreCandidate(
  left: BrainSurfaceProjectionCandidate,
  right: BrainSurfaceProjectionCandidate,
): BrainSurfaceProjectionCandidate {
  if (left.family === "media" && left.anchorKind === "video_root") {
    return left;
  }
  if (right.family === "media" && right.anchorKind === "video_root") {
    return right;
  }
  if (left.revealOrder !== right.revealOrder) {
    return left.revealOrder < right.revealOrder ? left : right;
  }
  return (left.focusPriority ?? 0) >= (right.focusPriority ?? 0) ? left : right;
}

export function pickCoreBrainSurfaceCandidates(
  candidates: readonly BrainSurfaceProjectionCandidate[],
): BrainSurfaceProjectionCandidate[] {
  const byFamily = new Map<BrainSurfaceCandidateFamily, BrainSurfaceProjectionCandidate>();
  for (const candidate of candidates) {
    if (!isCoreBrainSurfaceCandidate(candidate)) {
      continue;
    }
    const existing = byFamily.get(candidate.family);
    byFamily.set(
      candidate.family,
      existing ? preferCoreCandidate(existing, candidate) : candidate,
    );
  }
  return [...byFamily.values()].sort(
    (left, right) => left.revealOrder - right.revealOrder,
  );
}

/** Stage 2 — nodes linked to the active anchor (cluster · affinity · memo). */
export function resolveRelatedBrainSurfaceCandidates(input: {
  active: BrainSurfaceProjectionCandidate;
  candidates: readonly BrainSurfaceProjectionCandidate[];
}): BrainSurfaceProjectionCandidate[] {
  const { active, candidates } = input;
  const clusterId = active.clusterId?.trim() ?? null;
  const guideId =
    active.sourceGuideNodeId?.trim() ||
    active.parentGuideNodeId?.trim() ||
    null;
  const affinity = new Set(active.focusAffinityFamilies ?? []);

  const related = candidates.filter((candidate) => {
    if (candidate.id === active.id) {
      return true;
    }
    if (active.anchorKind === "video_root") {
      if (candidate.anchorKind !== "inferred_place") {
        return false;
      }
      if (clusterId && candidate.clusterId === clusterId) {
        return true;
      }
      if (
        guideId &&
        (candidate.parentGuideNodeId === guideId ||
          candidate.sourceGuideNodeId === guideId)
      ) {
        return true;
      }
      return false;
    }
    if (clusterId && candidate.clusterId === clusterId) {
      return true;
    }
    if (
      guideId &&
      (candidate.parentGuideNodeId === guideId ||
        candidate.sourceGuideNodeId === guideId)
    ) {
      return true;
    }
    if (candidate.family === "memo" && candidate.clusterId === `memo:${active.family}`) {
      return true;
    }
    if (affinity.has(candidate.family) && candidate.anchorKind !== "inferred_place") {
      return true;
    }
    if (
      affinity.has(candidate.family) &&
      candidate.anchorKind === "inferred_place" &&
      guideId &&
      (candidate.parentGuideNodeId === guideId ||
        candidate.sourceGuideNodeId === guideId)
    ) {
      return true;
    }
    return false;
  });

  return related.sort((left, right) => {
    if (left.id === active.id) {
      return -1;
    }
    if (right.id === active.id) {
      return 1;
    }
    return left.revealOrder - right.revealOrder;
  });
}

export function filterBrainSurfaceCandidatesForDisclosure(input: {
  candidates: readonly BrainSurfaceProjectionCandidate[];
  stage: BrainSurfaceDisclosureStage;
  activeCandidate: BrainSurfaceProjectionCandidate | null;
  allCandidates?: readonly BrainSurfaceProjectionCandidate[];
}): BrainSurfaceProjectionCandidate[] {
  const pool = input.allCandidates ?? input.candidates;

  if (input.stage === "core") {
    return pickCoreBrainSurfaceCandidates(input.candidates);
  }

  if (input.stage === "detail" && input.activeCandidate) {
    return [input.activeCandidate];
  }

  if (input.stage === "related" && input.activeCandidate) {
    return resolveRelatedBrainSurfaceCandidates({
      active: input.activeCandidate,
      candidates: pool,
    });
  }

  return pickCoreBrainSurfaceCandidates(input.candidates);
}
