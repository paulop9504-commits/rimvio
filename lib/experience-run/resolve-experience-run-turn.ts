import {
  classifyExperienceRunIntent,
  mergeSituationMessages,
} from "@/lib/experience-run/classify-experience-run-intent";
import type { ExperienceRunResult } from "@/lib/experience-run/experience-run-types";
import { runBusinessTripExperienceRun } from "@/lib/experience-run/run-business-trip-experience-run";
import {
  clearPendingSituationLock,
  readPendingSituationLock,
  writePendingSituationLock,
} from "@/lib/experience-run/situation-lock";
import {
  buildTravelContextMessage,
  durationConfirmLine,
  mergeTravelSlots,
  nextTravelSlot,
  offerGpsForSlot,
  parseTravelSlotReply,
  parseTravelSlotsFromMessage,
  questionForTravelSlot,
  travelProfileForMessage,
  type TravelFilledSlots,
  type TravelSlotName,
} from "@/lib/experience-run/travel-context-slots";

export type ResolveExperienceRunTurnInput = {
  message: string;
  lat?: number | null;
  lng?: number | null;
  referenceDate?: string;
};

function usesTravelSlotFlow(
  profile: import("@/lib/experience-run/experience-run-types").ExperienceRunProfile,
): boolean {
  return profile === "leisure_travel";
}

function clarifyResult(input: {
  profile: import("@/lib/experience-run/experience-run-types").ExperienceRunProfile;
  seedMessage: string;
  questionKo: string;
  pendingSlot: TravelSlotName | null;
  filledSlots: TravelFilledSlots;
  destination: string | null;
}): ExperienceRunResult {
  writePendingSituationLock({
    profile: input.profile,
    seedMessage: input.seedMessage,
    destination: input.destination,
    askedAt: new Date().toISOString(),
    pendingSlot: input.pendingSlot,
    filledSlots: input.filledSlots,
  });
  return {
    kind: "clarify",
    questionKo: input.questionKo,
    profile: input.profile,
    seedMessage: input.seedMessage,
    pendingSlot: input.pendingSlot,
    offerGps: input.pendingSlot ? offerGpsForSlot(input.pendingSlot) : false,
  };
}

async function finishTravelRun(input: {
  profile: import("@/lib/experience-run/experience-run-types").ExperienceRunProfile;
  seedMessage: string;
  filledSlots: TravelFilledSlots;
  lat?: number | null;
  lng?: number | null;
  referenceDate?: string;
}): Promise<ExperienceRunResult> {
  clearPendingSituationLock();
  const mergedMessage = buildTravelContextMessage(input.seedMessage, input.filledSlots);
  const summary = await runBusinessTripExperienceRun({
    message: mergedMessage,
    profile: input.profile,
    lat: input.lat ?? input.filledSlots.originLat ?? null,
    lng: input.lng ?? input.filledSlots.originLng ?? null,
    referenceDate: input.referenceDate,
    travelSlots: input.filledSlots,
  });
  return { kind: "summary", summary, closeSheet: true };
}

function afterSlotFilled(input: {
  filledSlots: TravelFilledSlots;
  lastSlot: TravelSlotName;
}): { next: TravelSlotName | null; questionKo: string | null } {
  if (input.lastSlot === "duration" && input.filledSlots.durationDays) {
    const next = nextTravelSlot(input.filledSlots);
    const confirm = durationConfirmLine(input.filledSlots.durationDays);
    return {
      next,
      questionKo: next
        ? `${confirm} ${questionForTravelSlot(next, input.filledSlots)}`
        : null,
    };
  }
  const next = nextTravelSlot(input.filledSlots);
  return {
    next,
    questionKo: next ? questionForTravelSlot(next, input.filledSlots) : null,
  };
}

/**
 * CaptureSheet / composer agent turn — travel slot collect, then auto-run.
 */
export async function resolveExperienceRunTurn(
  input: ResolveExperienceRunTurnInput,
): Promise<ExperienceRunResult> {
  const trimmed = input.message.trim();
  const referenceDate = input.referenceDate ?? new Date().toISOString().slice(0, 10);

  const pending = readPendingSituationLock();
  if (pending) {
    if (usesTravelSlotFlow(pending.profile) && pending.pendingSlot) {
      const patch = parseTravelSlotReply({
        slot: pending.pendingSlot,
        reply: trimmed || "GPS",
        referenceDate,
        lat: input.lat,
        lng: input.lng,
      });
      const filledSlots = mergeTravelSlots(pending.filledSlots ?? {}, patch);
      const destination =
        filledSlots.destination ?? pending.destination ?? extractDestination(filledSlots);

      if (pending.pendingSlot === "duration" && !filledSlots.durationDays) {
        return clarifyResult({
          profile: pending.profile,
          seedMessage: pending.seedMessage,
          questionKo: questionForTravelSlot("duration", filledSlots),
          pendingSlot: "duration",
          filledSlots,
          destination,
        });
      }

      const advanced = afterSlotFilled({
        filledSlots,
        lastSlot: pending.pendingSlot,
      });

      if (!advanced.next) {
        return finishTravelRun({
          profile: pending.profile,
          seedMessage: pending.seedMessage,
          filledSlots,
          lat: input.lat,
          lng: input.lng,
          referenceDate,
        });
      }

      return clarifyResult({
        profile: pending.profile,
        seedMessage: pending.seedMessage,
        questionKo:
          advanced.questionKo ?? questionForTravelSlot(advanced.next, filledSlots),
        pendingSlot: advanced.next,
        filledSlots,
        destination,
      });
    }

    clearPendingSituationLock();
    const merged = mergeSituationMessages(pending.seedMessage, trimmed);
    const summary = await runBusinessTripExperienceRun({
      message: merged,
      profile: pending.profile,
      lat: input.lat,
      lng: input.lng,
      referenceDate,
    });
    return { kind: "summary", summary, closeSheet: true };
  }

  if (!trimmed) {
    return { kind: "noop" };
  }

  const intent = classifyExperienceRunIntent(trimmed, referenceDate);
  if (!intent) {
    return { kind: "noop" };
  }

  if (intent.profile === "leisure_travel") {
    const initialSlots = parseTravelSlotsFromMessage(trimmed, referenceDate);
    const filledSlots = mergeTravelSlots(
      { destination: intent.destination },
      initialSlots,
    );
    const next = nextTravelSlot(filledSlots);

    if (next) {
      return clarifyResult({
        profile: intent.profile,
        seedMessage: trimmed,
        questionKo: questionForTravelSlot(next, filledSlots),
        pendingSlot: next,
        filledSlots,
        destination: filledSlots.destination ?? null,
      });
    }

    return finishTravelRun({
      profile: intent.profile,
      seedMessage: trimmed,
      filledSlots,
      lat: input.lat,
      lng: input.lng,
      referenceDate,
    });
  }

  if (intent.needsClarify && intent.clarifyPromptKo) {
    writePendingSituationLock({
      profile: intent.profile,
      seedMessage: trimmed,
      destination: intent.destination,
      askedAt: new Date().toISOString(),
    });
    return {
      kind: "clarify",
      questionKo: intent.clarifyPromptKo,
      profile: intent.profile,
      seedMessage: trimmed,
    };
  }

  const summary = await runBusinessTripExperienceRun({
    message: trimmed,
    profile: intent.profile,
    lat: input.lat,
    lng: input.lng,
    referenceDate,
  });

  return { kind: "summary", summary, closeSheet: true };
}

function extractDestination(slots: TravelFilledSlots): string | null {
  return slots.destination?.trim() || null;
}
