import { publishContextConditionDiscoveryOverlay } from "@/lib/globe/context-condition-ai/context-condition-discovery-overlay-bridge";
import type { ContextConditionAnchorPinOutcome } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import {
  buildExperienceScenarioFromOutcome,
  readActiveScenarioBranch,
  withScenarioBranch,
  withScenarioPlaybackCursor,
} from "@/lib/globe/experience-simulation/build-experience-scenario";
import { offerSimulationTerminalBookingInjection } from "@/lib/globe/experience-simulation/offer-simulation-terminal-booking-injection";
import {
  buildScenarioDiscoveryOverlay,
  resolvePlaybackLegIndex,
} from "@/lib/globe/experience-simulation/build-scenario-discovery-overlay";
import { diffItinerary } from "@/lib/globe/experience-simulation/schedule-scenario-nodes";
import type {
  ExperienceScenario,
  ExperienceScenarioBranchId,
  ExperienceSimulationState,
  ItineraryDiff,
  SimulationPlaybackState,
} from "@/lib/globe/experience-simulation/types";

const EVENT_NAME = "rimvio-globe-experience-simulation";

const DEFAULT_PLAYBACK: SimulationPlaybackState = {
  playing: false,
  cursorIndex: 0,
  activeLegIndex: 0,
};

let state: ExperienceSimulationState = {
  scenario: null,
  playback: DEFAULT_PLAYBACK,
  itineraryDiff: null,
};

let lastRadiusM = 800;

function emit(next: ExperienceSimulationState): void {
  state = next;
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ExperienceSimulationState>(EVENT_NAME, { detail: next }),
  );
}

function publishOverlayForState(next: ExperienceSimulationState): void {
  if (!next.scenario) {
    return;
  }
  publishContextConditionDiscoveryOverlay(
    buildScenarioDiscoveryOverlay({
      scenario: next.scenario,
      radiusM: lastRadiusM,
      playbackLegIndex: next.playback.activeLegIndex,
    }),
  );
}

export function readExperienceSimulationState(): ExperienceSimulationState {
  return state;
}

export function clearExperienceSimulation(): void {
  emit({
    scenario: null,
    playback: DEFAULT_PLAYBACK,
    itineraryDiff: null,
  });
}

function afterPlaybackUpdate(
  scenario: ExperienceScenario,
  cursorIndex: number,
): void {
  offerSimulationTerminalBookingInjection({ scenario, cursorIndex });
}

export function refreshExperienceScenarioFromOutcome(input: {
  contextEventId: string;
  anchorTitle: string;
  anchorLat: number;
  anchorLng: number;
  outcome: ContextConditionAnchorPinOutcome;
}): void {
  if (!state.scenario) {
    const built = buildExperienceScenarioFromOutcome({
      contextEventId: input.contextEventId,
      anchorTitle: input.anchorTitle,
      anchorLat: input.anchorLat,
      anchorLng: input.anchorLng,
      outcome: input.outcome,
    });
    if (!built) {
      return;
    }
    publishExperienceScenario({
      scenario: built,
      radiusM: input.outcome.radiusM,
    });
    return;
  }

  const beforeIds = readActiveScenarioBranch(state.scenario).nodes.map(
    (node) => node.placeId,
  );
  const preservedBranch = state.scenario.activeBranchId;
  const preservedCursor = Math.min(
    state.playback.cursorIndex,
    input.outcome.recommendations.length,
  );

  const scenario =
    buildExperienceScenarioFromOutcome({
      contextEventId: state.scenario.contextEventId,
      anchorTitle: input.anchorTitle,
      anchorLat: input.anchorLat,
      anchorLng: input.anchorLng,
      outcome: input.outcome,
      activeBranchId: preservedBranch,
      cursorIndex: preservedCursor,
    }) ?? null;

  if (!scenario) {
    return;
  }

  const afterIds = readActiveScenarioBranch(scenario).nodes.map(
    (node) => node.placeId,
  );
  const itineraryDiff = diffItinerary(beforeIds, afterIds);
  const playback: SimulationPlaybackState = {
    playing: state.playback.playing,
    cursorIndex: preservedCursor,
    activeLegIndex: resolvePlaybackLegIndex(scenario, preservedCursor),
  };
  const next: ExperienceSimulationState = {
    scenario,
    playback,
    itineraryDiff:
      itineraryDiff.inserted.length > 0 ||
      itineraryDiff.removed.length > 0 ||
      itineraryDiff.reordered
        ? itineraryDiff
        : null,
  };
  lastRadiusM = input.outcome.radiusM;
  emit(next);
  publishOverlayForState(next);
  afterPlaybackUpdate(scenario, playback.cursorIndex);
}

export function publishExperienceScenario(input: {
  scenario: ExperienceScenario;
  radiusM?: number;
}): void {
  if (input.radiusM != null) {
    lastRadiusM = input.radiusM;
  }
  const playback: SimulationPlaybackState = {
    playing: false,
    cursorIndex: 0,
    activeLegIndex: 0,
  };
  const next: ExperienceSimulationState = {
    scenario: input.scenario,
    playback,
    itineraryDiff: null,
  };
  emit(next);
  publishOverlayForState(next);
  afterPlaybackUpdate(input.scenario, playback.cursorIndex);
}

export function setExperienceSimulationBranch(branchId: ExperienceScenarioBranchId): void {
  if (!state.scenario) {
    return;
  }
  const beforeIds = readActiveScenarioBranch(state.scenario).nodes.map(
    (node) => node.placeId,
  );
  const scenario = withScenarioBranch(state.scenario, branchId, 0);
  const afterIds = readActiveScenarioBranch(scenario).nodes.map(
    (node) => node.placeId,
  );
  const itineraryDiff = diffItinerary(beforeIds, afterIds);
  const playback: SimulationPlaybackState = {
    playing: false,
    cursorIndex: 0,
    activeLegIndex: 0,
  };
  const next: ExperienceSimulationState = {
    scenario,
    playback,
    itineraryDiff: itineraryDiff.inserted.length > 0 ||
      itineraryDiff.removed.length > 0 ||
      itineraryDiff.reordered
      ? itineraryDiff
      : null,
  };
  emit(next);
  publishOverlayForState(next);
}

export function setExperienceSimulationPlayback(
  playback: Partial<SimulationPlaybackState>,
): void {
  if (!state.scenario) {
    return;
  }
  const cursorIndex = playback.cursorIndex ?? state.playback.cursorIndex;
  const scenario = withScenarioPlaybackCursor(state.scenario, cursorIndex);
  const activeLegIndex = resolvePlaybackLegIndex(scenario, cursorIndex);
  const nextPlayback: SimulationPlaybackState = {
    playing: playback.playing ?? state.playback.playing,
    cursorIndex,
    activeLegIndex,
  };
  const next: ExperienceSimulationState = {
    ...state,
    scenario,
    playback: nextPlayback,
  };
  emit(next);
  publishOverlayForState(next);
  afterPlaybackUpdate(next.scenario!, nextPlayback.cursorIndex);
}

export function advanceExperienceSimulationStep(): boolean {
  if (!state.scenario) {
    return false;
  }
  const branch = readActiveScenarioBranch(state.scenario);
  const nextIndex = state.playback.cursorIndex + 1;
  if (nextIndex > branch.nodes.length) {
    setExperienceSimulationPlayback({ playing: false, cursorIndex: branch.nodes.length });
    return false;
  }
  setExperienceSimulationPlayback({ cursorIndex: nextIndex });
  return nextIndex <= branch.nodes.length;
}

export function subscribeExperienceSimulation(
  listener: (detail: ExperienceSimulationState) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<ExperienceSimulationState>).detail);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

export function readExperienceItineraryDiff(): ItineraryDiff | null {
  return state.itineraryDiff;
}
