/**
 * Build pending Travel Context draft fields from ingress compile + travel slots.
 */

import type { GlobeIngressCompileResult } from "@/lib/globe-ingress/types";
import { extractRunDestination } from "@/lib/experience-run/classify-experience-run-intent";
import type { ExperienceRunProfile } from "@/lib/experience-run/experience-run-types";
import { resolveTripContextAnchor } from "@/lib/experience-run/resolve-trip-context-anchor";
import {
  computeWindowEndIso,
  parseTravelSlotsFromMessage,
  travelProfileForMessage,
  type TravelFilledSlots,
} from "@/lib/experience-run/travel-context-slots";
import type { PendingContextCreateDraft } from "@/lib/globe-ingress/pending-context-create-store";

function formatDateLabelKo(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): string | null {
  if (!startIso?.trim()) {
    return null;
  }
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) {
    return null;
  }
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  if (!endIso?.trim()) {
    return fmt(start);
  }
  const end = new Date(endIso);
  if (Number.isNaN(end.getTime())) {
    return fmt(start);
  }
  return `${fmt(start)} ~ ${fmt(end)}`;
}

function formatDurationLabelKo(days: number | null | undefined): string | null {
  if (days == null || days <= 0) {
    return null;
  }
  if (days === 1) {
    return "1일";
  }
  const nights = days - 1;
  if (nights > 0) {
    return `${nights}박${days}일`;
  }
  return `${days}일`;
}

export function buildPendingContextCreateDraft(input: {
  graphId: string;
  utterance: string;
  compiled: GlobeIngressCompileResult;
  referenceDate?: string;
  profile?: ExperienceRunProfile | null;
}): PendingContextCreateDraft {
  const utterance = input.utterance.trim();
  const referenceDate =
    input.referenceDate ?? new Date().toISOString().slice(0, 10);
  const travelSlots: TravelFilledSlots = parseTravelSlotsFromMessage(
    utterance,
    referenceDate,
  );
  const destination =
    travelSlots.destination?.trim() ||
    extractRunDestination(utterance) ||
    null;
  const anchor = resolveTripContextAnchor(destination);
  const profile =
    input.profile ??
    travelProfileForMessage(utterance) ??
    "leisure_travel";
  const placeLabel =
    anchor?.placeLabel ?? destination?.trim() ?? "여행지";
  const titleKo = `${placeLabel} 여행`;
  const windowEndIso =
    travelSlots.durationDays && travelSlots.anchorTimeIso
      ? computeWindowEndIso(travelSlots.anchorTimeIso, travelSlots.durationDays)
      : null;

  return {
    graphId: input.graphId.trim(),
    utterance,
    compiled: input.compiled,
    travelSlots: {
      ...travelSlots,
      destination: destination,
    },
    profile,
    titleKo,
    durationLabelKo: formatDurationLabelKo(travelSlots.durationDays ?? null),
    dateLabelKo: formatDateLabelKo(
      travelSlots.anchorTimeIso ?? null,
      windowEndIso,
    ),
    anchorLabelKo: anchor
      ? `${anchor.placeLabel} 도심(임시)`
      : `${placeLabel}(임시)`,
    anchorLat: anchor?.lat ?? null,
    anchorLng: anchor?.lng ?? null,
    reality: "draft",
    createdAtIso: new Date().toISOString(),
  };
}
