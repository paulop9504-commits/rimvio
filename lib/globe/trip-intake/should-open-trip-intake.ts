import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import { classifyContextCommand } from "@/lib/context-command/classify-context-command";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { classifyTravelRequestScope } from "@/lib/container-ai/classify-travel-request-scope";
import {
  hasCompleteTripIntake,
  assessTripIntakeGaps,
} from "@/lib/globe/trip-intake/assess-trip-intake-gaps";
import { readTripIntakeState } from "@/lib/globe/trip-intake/read-trip-intake-state";

export function isBroadTripPackageMessage(message: string): boolean {
  const text = message.trim();
  if (!text) {
    return false;
  }
  // ADR-028 — migrate/clone/save are Command Bar ops, not trip package intake.
  if (classifyContextCommand(text)) {
    return false;
  }
  return classifyTravelRequestScope(text).scope === "broad";
}

/** Broad travel package + missing slots → Field intake sheet (not chat survey). */
export function shouldOpenTripIntake(input: {
  message: string;
  event: EventCandidate | null | undefined;
  blueprint?: ContextBlueprint | null;
}): boolean {
  if (!isBroadTripPackageMessage(input.message)) {
    return false;
  }
  const state = readTripIntakeState({
    event: input.event,
    message: input.message,
    blueprint: input.blueprint,
  });
  return !hasCompleteTripIntake(state);
}

export function readTripIntakeGaps(input: {
  message: string;
  event: EventCandidate | null | undefined;
  blueprint?: ContextBlueprint | null;
}) {
  const state = readTripIntakeState({
    event: input.event,
    message: input.message,
    blueprint: input.blueprint,
  });
  return {
    state,
    gaps: assessTripIntakeGaps(state),
  };
}
