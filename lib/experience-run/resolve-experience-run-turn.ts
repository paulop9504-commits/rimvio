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

export type ResolveExperienceRunTurnInput = {
  message: string;
  lat?: number | null;
  lng?: number | null;
  referenceDate?: string;
};

/**
 * CaptureSheet agent turn — one situation clarify, then auto-run (Cursor-style).
 * Returns noop when message should use legacy personal-context ask.
 */
export async function resolveExperienceRunTurn(
  input: ResolveExperienceRunTurnInput,
): Promise<ExperienceRunResult> {
  const trimmed = input.message.trim();
  if (!trimmed) {
    return { kind: "noop" };
  }

  const pending = readPendingSituationLock();
  if (pending) {
    clearPendingSituationLock();
    const merged = mergeSituationMessages(pending.seedMessage, trimmed);
    const summary = await runBusinessTripExperienceRun({
      message: merged,
      profile: pending.profile,
      lat: input.lat,
      lng: input.lng,
      referenceDate: input.referenceDate,
    });
    return { kind: "summary", summary, closeSheet: true };
  }

  const intent = classifyExperienceRunIntent(trimmed);
  if (!intent) {
    return { kind: "noop" };
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
    referenceDate: input.referenceDate,
  });

  return { kind: "summary", summary, closeSheet: true };
}
