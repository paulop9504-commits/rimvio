import type {
  BrainSurfaceCandidateFamily,
  BrainSurfaceProjectionCandidate,
} from "@/lib/situation-projection/brain-surface-types";

type FocusBand = "active" | "family" | "support" | "ambient";
type GravityMode = "focused" | "pinned";

function shouldKeepForFocusedFamily(
  candidate: BrainSurfaceProjectionCandidate,
  focusedFamily: BrainSurfaceCandidateFamily,
): boolean {
  if (candidate.family === focusedFamily) {
    return true;
  }
  if (candidate.family === "info" || candidate.family === "event" || candidate.family === "memo") {
    return true;
  }
  if (focusedFamily === "media" && candidate.family === "trace_place") {
    return true;
  }
  if (focusedFamily === "trace_place" && candidate.family === "media") {
    return true;
  }
  return candidate.focusAffinityFamilies?.includes(focusedFamily) ?? false;
}

function focusBandForCandidate(input: {
  candidate: BrainSurfaceProjectionCandidate;
  focusedFamily: BrainSurfaceCandidateFamily;
  activeCandidateId?: string | null;
}): FocusBand {
  if (input.activeCandidateId && input.candidate.id === input.activeCandidateId) {
    return "active";
  }
  if (input.candidate.family === input.focusedFamily) {
    return "family";
  }
  if (
    input.candidate.family === "info" ||
    input.candidate.family === "event" ||
    input.candidate.family === "memo" ||
    input.candidate.focusAffinityFamilies?.includes(input.focusedFamily)
  ) {
    return "support";
  }
  return "ambient";
}

function focusPriorityForBand(band: FocusBand): number {
  switch (band) {
    case "active":
      return 100;
    case "family":
      return 82;
    case "support":
      return 64;
    case "ambient":
    default:
      return 24;
  }
}

function interpolateCoords(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  ratio: number,
): { lat: number; lng: number } {
  return {
    lat: from.lat + (to.lat - from.lat) * ratio,
    lng: from.lng + (to.lng - from.lng) * ratio,
  };
}

function restyleCandidateForBand(input: {
  candidate: BrainSurfaceProjectionCandidate;
  band: FocusBand;
  center: { lat: number; lng: number };
  mode: GravityMode;
}): BrainSurfaceProjectionCandidate {
  const focused = input.mode === "focused";
  switch (input.band) {
    case "active":
      return {
        ...input.candidate,
        focusPriority: 100,
        markerScale: 1.18,
        markerOpacity: 1,
        zIndexBoost: 5,
      };
    case "family": {
      const shifted = interpolateCoords(
        input.candidate,
        input.center,
        focused ? 0.18 : 0.1,
      );
      return {
        ...input.candidate,
        lat: shifted.lat,
        lng: shifted.lng,
        focusPriority: focused ? 82 : 72,
        markerScale: focused ? 1.08 : 1.03,
        markerOpacity: focused ? 0.98 : 0.94,
        zIndexBoost: focused ? 3 : 2,
      };
    }
    case "support": {
      const shifted = interpolateCoords(
        input.candidate,
        input.center,
        focused ? 0.1 : 0.06,
      );
      return {
        ...input.candidate,
        lat: shifted.lat,
        lng: shifted.lng,
        focusPriority: focused ? 64 : 56,
        markerScale: focused ? 0.97 : 0.95,
        markerOpacity: focused ? 0.88 : 0.86,
        zIndexBoost: 1,
      };
    }
    case "ambient":
    default:
      return {
        ...input.candidate,
        focusPriority: focused ? 24 : 38,
        markerScale: focused ? 0.88 : 0.92,
        markerOpacity: focused ? 0.58 : 0.76,
        zIndexBoost: 0,
      };
  }
}

export function filterBrainSurfaceCandidatesForFocus(input: {
  candidates: readonly BrainSurfaceProjectionCandidate[];
  focusedFamily: BrainSurfaceCandidateFamily | null;
  activeCandidateId?: string | null;
  gravityMode?: GravityMode | null;
}): BrainSurfaceProjectionCandidate[] {
  const focusedFamily = input.focusedFamily;
  if (!focusedFamily) {
    return [...input.candidates];
  }
  if (input.gravityMode === "pinned") {
    return [...input.candidates];
  }
  return input.candidates.filter((candidate) => {
    if (input.activeCandidateId && candidate.id === input.activeCandidateId) {
      return true;
    }
    return shouldKeepForFocusedFamily(candidate, focusedFamily);
  });
}

export function prioritizeBrainSurfaceCandidatesForFocus(input: {
  candidates: readonly BrainSurfaceProjectionCandidate[];
  focusedFamily: BrainSurfaceCandidateFamily | null;
  activeCandidateId?: string | null;
  gravityMode?: GravityMode | null;
}): BrainSurfaceProjectionCandidate[] {
  const filtered = filterBrainSurfaceCandidatesForFocus(input);
  const gravityMode = input.gravityMode ?? (input.focusedFamily ? "focused" : null);
  if (!input.focusedFamily || !gravityMode) {
    return filtered.map((candidate) => ({
      ...candidate,
      focusPriority: 50,
      markerScale: 1,
      markerOpacity: 1,
      zIndexBoost: 0,
    }));
  }

  const centerCandidate =
    filtered.find((candidate) => candidate.id === input.activeCandidateId) ??
    filtered.find((candidate) => candidate.family === input.focusedFamily) ??
    filtered[0];

  if (!centerCandidate) {
    return filtered;
  }

  return filtered
    .map((candidate) =>
      restyleCandidateForBand({
        candidate,
        band: focusBandForCandidate({
          candidate,
          focusedFamily: input.focusedFamily!,
          activeCandidateId: input.activeCandidateId,
        }),
        center: { lat: centerCandidate.lat, lng: centerCandidate.lng },
        mode: gravityMode,
      }),
    )
    .sort((left, right) => {
      const priorityDelta = (right.focusPriority ?? 0) - (left.focusPriority ?? 0);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
      return left.revealOrder - right.revealOrder;
    });
}
