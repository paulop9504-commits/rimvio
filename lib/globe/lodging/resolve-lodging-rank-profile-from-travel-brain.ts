import type { EventCandidate } from "@/lib/events/event-candidate";
import { countDiscoveryFeedRejectSignals } from "@/lib/globe/intelligent-pin/record-discovery-feed-scroll-signal";
import type {
  LodgingRankContextHints,
  LodgingRankMode,
  LodgingRankProfile,
} from "@/lib/globe/lodging/lodging-rank-profile";
import {
  DEFAULT_LODGING_RANK_PROFILE,
  resolveLodgingRankProfile,
} from "@/lib/globe/lodging/lodging-rank-profile";
import { readLodgingRankModeOverride } from "@/lib/globe/lodging/lodging-rank-mode-session-store";
import type {
  TravelBrainSlot,
  TravelBrainSlotId,
  TravelBrainState,
  TravelBudgetBand,
  TravelCompanionMode,
  TravelLodgingPriority,
} from "@/lib/situation-projection/travel-brain-personalization";
import { buildTravelBrainState } from "@/lib/situation-projection/travel-brain-personalization";

/** Apply lodging_priority to rank profile when slot confidence clears this bar. */
export const LODGING_RANK_TRAVEL_BRAIN_CONFIDENCE_MIN = 0.55 as const;

function slotApplies<T extends TravelBrainSlotId>(
  slot: TravelBrainSlot<T>,
): boolean {
  return (
    slot.confidence >= LODGING_RANK_TRAVEL_BRAIN_CONFIDENCE_MIN ||
    slot.source === "learned"
  );
}

/** TravelBrain slots → LodgingRankContextHints (confidence-gated). */
export function resolveLodgingRankContextHintsFromTravelBrain(
  travelBrain: TravelBrainState,
  extra?: {
    rejectSignalCount?: number;
  },
): LodgingRankContextHints {
  const hints: LodgingRankContextHints = {};

  if (slotApplies(travelBrain.slots.lodging_priority)) {
    hints.lodgingPriority = travelBrain.slots.lodging_priority.value;
  }
  if (slotApplies(travelBrain.slots.budget_band)) {
    hints.budgetBand = travelBrain.slots.budget_band.value;
  }
  if (slotApplies(travelBrain.slots.companion_mode)) {
    hints.companionMode = travelBrain.slots.companion_mode.value;
  }
  if (extra?.rejectSignalCount != null && extra.rejectSignalCount > 0) {
    hints.rejectSignalCount = extra.rejectSignalCount;
  }

  return hints;
}

export function resolveLodgingRankProfileFromTravelBrain(input: {
  travelBrain: TravelBrainState;
  mode?: LodgingRankMode | null;
  contextEventId?: string | null;
  rejectSignalCount?: number;
}): LodgingRankProfile {
  const rejectSignalCount =
    input.rejectSignalCount ??
    (input.contextEventId?.trim()
      ? countDiscoveryFeedRejectSignals(input.contextEventId.trim())
      : 0);

  const hints = resolveLodgingRankContextHintsFromTravelBrain(input.travelBrain, {
    rejectSignalCount,
  });

  const profile = resolveLodgingRankProfile({
    mode: input.mode ?? "auto",
    hints,
  });

  const lodgingSlot = input.travelBrain.slots.lodging_priority;
  if (
    profile.source === "context" &&
    slotApplies(lodgingSlot) &&
    lodgingSlot.reasonKo?.trim()
  ) {
    return {
      ...profile,
      reasonKo: lodgingSlot.reasonKo.trim(),
    };
  }

  return profile;
}

export function resolveLodgingRankProfileForEvent(input: {
  event: EventCandidate;
  mode?: LodgingRankMode | null;
  travelBrain?: TravelBrainState | null;
  contextEventId?: string | null;
}): LodgingRankProfile {
  const contextEventId = input.contextEventId ?? input.event.id;
  const mode =
    input.mode ??
    readLodgingRankModeOverride(contextEventId) ??
    "auto";
  const travelBrain = input.travelBrain ?? buildTravelBrainState(input.event);
  return resolveLodgingRankProfileFromTravelBrain({
    travelBrain,
    mode,
    contextEventId,
  });
}

/** L2 trace — which travel-brain axes shaped the active profile. */
export function describeLodgingRankTravelBrainAxes(
  travelBrain: TravelBrainState,
): {
  lodgingPriority: TravelLodgingPriority | null;
  budgetBand: TravelBudgetBand | null;
  companionMode: TravelCompanionMode | null;
} {
  return {
    lodgingPriority: slotApplies(travelBrain.slots.lodging_priority)
      ? travelBrain.slots.lodging_priority.value
      : null,
    budgetBand: slotApplies(travelBrain.slots.budget_band)
      ? travelBrain.slots.budget_band.value
      : null,
    companionMode: slotApplies(travelBrain.slots.companion_mode)
      ? travelBrain.slots.companion_mode.value
      : null,
  };
}

export function isDefaultLodgingRankProfile(profile: LodgingRankProfile): boolean {
  return (
    profile.mode === DEFAULT_LODGING_RANK_PROFILE.mode &&
    profile.source === DEFAULT_LODGING_RANK_PROFILE.source
  );
}
