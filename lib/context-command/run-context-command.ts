/**
 * Run Context Command Bar ops — migrate · clone · save (ADR-028).
 * migrate/clone must move the globe pin + session graph anchor (not title-only).
 */

import { copy } from "@/lib/copy/human-ko";
import { classifyContextCommand } from "@/lib/context-command/classify-context-command";
import type { ContextCommandResult } from "@/lib/context-command/types";
import { ensureTripContextEvent } from "@/lib/experience-run/ensure-trip-context-event";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { clearContextConditionLastBatch } from "@/lib/globe/context-condition-ai";
import { createPersonalGlobePinFromEvent } from "@/lib/globe/create-personal-globe-pin";
import { relocateGlobeContextPin } from "@/lib/globe/relocate-globe-context-pin";
import { resolveEventGlobeCoords } from "@/lib/globe/resolve-event-globe-coords";
import {
  ensureSessionGraph,
  readSessionGraph,
  writeSessionGraph,
} from "@/lib/graph-command/session-graph-store";
import type { EventCandidate } from "@/lib/events/event-candidate";

function inferProfileFromTitle(
  title: string,
): "eatery_search" | "lodging_search" | "leisure_travel" {
  if (/맛집|카페|식당/u.test(title)) {
    return "eatery_search";
  }
  if (/숙소|호텔|항공/u.test(title)) {
    return "lodging_search";
  }
  return "leisure_travel";
}

function criteriaHintFromTitle(title: string): string {
  if (/맛집|카페|식당/u.test(title)) {
    return "맛집";
  }
  if (/숙소|호텔/u.test(title)) {
    return "숙소";
  }
  return "주변";
}

/** Persist pin + session graph to event coords (globe must move). */
function syncGlobeAnchorFromEvent(event: EventCandidate): {
  readonly lat: number;
  readonly lng: number;
  readonly placeLabel: string;
} {
  const coords = resolveEventGlobeCoords(event);
  relocateGlobeContextPin({
    eventId: event.id,
    lat: coords.lat,
    lng: coords.lng,
    placeLabel: coords.placeLabel,
  });
  const graph = readSessionGraph(event.id);
  if (graph) {
    writeSessionGraph({
      ...graph,
      anchorLat: coords.lat,
      anchorLng: coords.lng,
      updatedAtIso: new Date().toISOString(),
    });
  } else {
    ensureSessionGraph({
      contextEventId: event.id,
      anchorLat: coords.lat,
      anchorLng: coords.lng,
    });
  }
  return coords;
}

export function runContextCommand(input: {
  readonly utterance: string;
  readonly contextEventId: string;
  readonly contextTitleKo?: string | null;
  readonly anchorPlaceName?: string | null;
}): ContextCommandResult {
  const classified = classifyContextCommand(input.utterance);
  if (!classified) {
    return { ok: false, reasonKo: copy.globe.contextCommandUnrecognized };
  }

  const existing = findLifeEventCandidate(input.contextEventId);
  const title =
    input.contextTitleKo?.trim() ||
    existing?.title?.trim() ||
    input.anchorPlaceName?.trim() ||
    "맥락";
  const profile = inferProfileFromTitle(title);
  const criteria = criteriaHintFromTitle(title);

  if (classified.kind === "save_snapshot") {
    return {
      ok: true,
      kind: "save_snapshot",
      toastKo: copy.globe.contextCommandSaveToast,
      assistantReplyKo: copy.globe.contextCommandSaveReply,
      contextEventId: input.contextEventId,
      destinationLabelKo: null,
      anchorLat: null,
      anchorLng: null,
      anchorPlaceLabelKo: null,
      shouldRescout: false,
      rescoutUtterance: null,
    };
  }

  const dest = classified.destinationLabelKo!.trim();

  if (classified.kind === "migrate_anchor") {
    const event = ensureTripContextEvent({
      message: `${dest} ${criteria} · ${classified.rawUtterance}`,
      existingEventId: input.contextEventId,
      profile,
    });
    clearContextConditionLastBatch(input.contextEventId);
    createPersonalGlobePinFromEvent({ event });
    const coords = syncGlobeAnchorFromEvent(event);
    return {
      ok: true,
      kind: "migrate_anchor",
      toastKo: copy.globe.contextCommandMigrateToast(dest),
      assistantReplyKo: copy.globe.contextCommandMigrateReply(dest),
      contextEventId: event.id,
      destinationLabelKo: dest,
      anchorLat: coords.lat,
      anchorLng: coords.lng,
      anchorPlaceLabelKo: coords.placeLabel,
      shouldRescout: true,
      rescoutUtterance: `${dest} ${criteria}`,
    };
  }

  // clone_context
  const cloned = ensureTripContextEvent({
    message: `${dest} ${criteria} · 복제 · ${title} · ${classified.rawUtterance}`,
    profile,
  });
  createPersonalGlobePinFromEvent({ event: cloned });
  const coords = syncGlobeAnchorFromEvent(cloned);
  return {
    ok: true,
    kind: "clone_context",
    toastKo: copy.globe.contextCommandCloneToast(dest),
    assistantReplyKo: copy.globe.contextCommandCloneReply(dest, title),
    contextEventId: cloned.id,
    destinationLabelKo: dest,
    anchorLat: coords.lat,
    anchorLng: coords.lng,
    anchorPlaceLabelKo: coords.placeLabel,
    shouldRescout: false,
    rescoutUtterance: null,
  };
}

export function tryRunContextCommand(input: {
  readonly utterance: string;
  readonly contextEventId: string;
  readonly contextTitleKo?: string | null;
  readonly anchorPlaceName?: string | null;
}): ContextCommandResult | null {
  if (!classifyContextCommand(input.utterance)) {
    return null;
  }
  return runContextCommand(input);
}
