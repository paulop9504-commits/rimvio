"use client";

import { appendCorrectionLog } from "@/lib/corrections/correction-log";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { geocodeAndSyncGlobeContextPlace } from "@/lib/globe/geocode-and-sync-globe-context-place";
import {
  readMirrorProvenance,
  upsertMirrorProvenanceMetadata,
} from "@/lib/globe/mirror-provenance";
import { GLOBE_CONTEXT_NOTE_KEY } from "@/lib/globe/pin-context-note";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export type ExperiencePinContextPatch = {
  title?: string;
  place?: string;
  note?: string;
};

function requireEvent(eventId: string): EventCandidate {
  const existing = findLifeEventCandidate(eventId.trim());
  if (!existing) {
    throw new Error("event_not_found");
  }
  return existing;
}

type PinContextEditableField = "title" | "place" | "note";

function normalizeComparableValue(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function resolvePatchedField(
  patch: ExperiencePinContextPatch,
): PinContextEditableField | null {
  if (patch.title !== undefined) {
    return "title";
  }
  if (patch.place !== undefined) {
    return "place";
  }
  if (patch.note !== undefined) {
    return "note";
  }
  return null;
}

function readEventFieldValue(
  event: EventCandidate,
  field: PinContextEditableField,
): string {
  if (field === "title") {
    return event.title.trim();
  }
  if (field === "place") {
    return event.place?.trim() ?? "";
  }
  const raw = event.metadata?.[GLOBE_CONTEXT_NOTE_KEY];
  return typeof raw === "string" ? raw.trim() : "";
}

function stampPinContextProvenance(input: {
  event: EventCandidate;
  patch: ExperiencePinContextPatch;
  nextTitle: string;
  nextPlace: string | undefined;
  nextNote: string;
  metadata: Record<string, unknown>;
  nowIso: string;
}): Record<string, unknown> {
  const provenance = readMirrorProvenance(input.event.metadata);
  const field = resolvePatchedField(input.patch);
  if (!provenance || !field) {
    return input.metadata;
  }
  if (provenance.permissions.editMode === "read_only") {
    throw new Error("edit_blocked");
  }

  const nextValue =
    field === "title"
      ? input.nextTitle
      : field === "place"
        ? input.nextPlace ?? ""
        : input.nextNote;

  if (provenance.permissions.editMode !== "local_edits") {
    return upsertMirrorProvenanceMetadata({
      metadata: input.metadata,
      patch: {},
      audit: {
        action: "local_context_edited",
        subject: {
          eventId: input.event.id,
          nodeId: provenance.origin.originNodeId ?? input.event.id,
        },
        refs: provenance.bridge,
        diff: [`field:${field}`],
      },
      nowIso: input.nowIso,
    });
  }

  const currentValue = readEventFieldValue(input.event, field);
  const hadOverride =
    field === "title"
      ? provenance.overrides?.titleOverridden === true
      : field === "place"
        ? provenance.overrides?.placeOverridden === true
        : provenance.overrides?.noteOverridden === true;
  const upstreamValue =
    field === "title"
      ? provenance.overrides?.titleUpstreamValue
      : field === "place"
        ? provenance.overrides?.placeUpstreamValue
        : provenance.overrides?.noteUpstreamValue;
  const normalizedUpstream = hadOverride
    ? normalizeComparableValue(upstreamValue)
    : normalizeComparableValue(currentValue);
  const normalizedNext = normalizeComparableValue(nextValue);
  const active = normalizedNext !== normalizedUpstream;

  return upsertMirrorProvenanceMetadata({
    metadata: input.metadata,
    patch: {
      overrides: {
        ...(field === "title"
          ? {
              titleOverridden: active,
              titleUpstreamValue: active ? normalizedUpstream || null : undefined,
              titleLocalValue: active ? normalizedNext || null : undefined,
            }
          : {}),
        ...(field === "place"
          ? {
              placeOverridden: active,
              placeUpstreamValue: active ? normalizedUpstream || null : undefined,
              placeLocalValue: active ? normalizedNext || null : undefined,
            }
          : {}),
        ...(field === "note"
          ? {
              noteOverridden: active,
              noteUpstreamValue: active ? normalizedUpstream || null : undefined,
              noteLocalValue: active ? normalizedNext || null : undefined,
            }
          : {}),
        updatedAtIso: input.nowIso,
      },
    },
    audit:
      active || hadOverride
        ? {
            action: active ? "local_override_set" : "local_override_cleared",
            subject: {
              eventId: input.event.id,
              nodeId: provenance.origin.originNodeId ?? input.event.id,
            },
            refs: provenance.bridge,
            diff: [
              `field:${field}`,
              active ? "state:local_override" : "state:restored_upstream",
            ],
          }
        : null,
    nowIso: input.nowIso,
  });
}

/** User-edited pin hero — title / place on globe experience pins. */
export async function patchExperiencePinContext(
  eventId: string,
  patch: ExperiencePinContextPatch,
): Promise<EventCandidate> {
  const existing = requireEvent(eventId);
  const nextTitle = patch.title?.trim() || existing.title;
  const nextPlace =
    patch.place !== undefined ? patch.place.trim() || undefined : existing.place;
  const nextNote = patch.note?.trim() ?? readEventFieldValue(existing, "note");
  const nowIso = new Date().toISOString();

  if (!nextTitle.trim()) {
    throw new Error("empty_title");
  }

  const priorPlace = existing.place?.trim() || null;
  const correctedPlace = nextPlace?.trim() || null;
  if (
    patch.place !== undefined &&
    correctedPlace &&
    correctedPlace !== priorPlace
  ) {
    await appendCorrectionLog({
      user_input: correctedPlace,
      ai_inferred_location: priorPlace,
      ai_inferred_place_name: priorPlace,
      user_corrected_location: correctedPlace,
      user_corrected_place_name: correctedPlace,
      outcome: "corrected",
    });
  }

  let nextMetadata: Record<string, unknown> = {
    ...existing.metadata,
    pinContextEditedAt: nowIso,
  };

  if (patch.note !== undefined) {
    const trimmed = patch.note.trim();
    nextMetadata = {
      ...nextMetadata,
      ...(trimmed
        ? { [GLOBE_CONTEXT_NOTE_KEY]: trimmed }
        : { [GLOBE_CONTEXT_NOTE_KEY]: undefined }),
    };
  }

  nextMetadata = stampPinContextProvenance({
    event: existing,
    patch,
    nextTitle,
    nextPlace,
    nextNote,
    metadata: nextMetadata,
    nowIso,
  });

  if (patch.place !== undefined && correctedPlace) {
    const staged = commitEventUpsert({
      id: existing.id,
      title: nextTitle,
      category: existing.category,
      source: existing.source,
      lifecycle: existing.lifecycle,
      datetime: existing.datetime,
      place: correctedPlace,
      containerId: existing.containerId,
      confidence: Math.min(0.98, existing.confidence + 0.02),
      metadata: nextMetadata,
      lifecycleUpdatedAt: existing.lifecycleUpdatedAt,
    });
    const geocoded = await geocodeAndSyncGlobeContextPlace({
      eventId: staged.id,
      placeLabel: correctedPlace,
      title: nextTitle,
      force: true,
    });
    return geocoded.event ?? staged;
  }

  return commitEventUpsert({
    id: existing.id,
    title: nextTitle,
    category: existing.category,
    source: existing.source,
    lifecycle: existing.lifecycle,
    datetime: existing.datetime,
    place: nextPlace,
    containerId: existing.containerId,
    confidence: Math.min(0.98, existing.confidence + 0.02),
    metadata: nextMetadata,
    lifecycleUpdatedAt: existing.lifecycleUpdatedAt,
  });
}
