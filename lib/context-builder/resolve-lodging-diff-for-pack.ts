/**
 * Resolve lodging Diff for Context Pack — selected stay · guests · lastBatch.
 * Carries previous pack Diff forward and overlays live slots / graph / batch.
 */

import type { ContextPackLodgingDiff } from "@/lib/context-builder/build-context-pack";
import { readContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import { readLodgingBookingSlots } from "@/lib/globe/context-hub/lodging-booking-slots";
import type { SessionGraphV1 } from "@/lib/graph-command/types";
import { findLifeEventCandidate } from "@/lib/life-read-model";

const DAY_MS = 24 * 60 * 60 * 1000;

function nightsBetween(
  checkInIso: string | null | undefined,
  checkOutIso: string | null | undefined,
): number | null {
  if (!checkInIso || !checkOutIso) {
    return null;
  }
  const start = new Date(checkInIso).getTime();
  const end = new Date(checkOutIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  return Math.max(1, Math.round((end - start) / DAY_MS));
}

function pickSelectedLodging(graph: SessionGraphV1 | null): {
  id: string | null;
  labelKo: string | null;
} {
  if (!graph) {
    return { id: null, labelKo: null };
  }
  const selected = graph.selectionIds
    .map((id) => graph.nodes.find((n) => n.id === id))
    .find((n) => n && n.kind === "lodging");
  if (selected) {
    return { id: selected.id, labelKo: selected.labelKo };
  }
  const pinned = graph.nodes.find((n) => n.kind === "lodging" && n.pinned);
  if (pinned) {
    return { id: pinned.id, labelKo: pinned.labelKo };
  }
  const visible = graph.nodes.find(
    (n) => n.kind === "lodging" && n.visible && n.lat != null && n.lng != null,
  );
  if (visible) {
    return { id: visible.id, labelKo: visible.labelKo };
  }
  return { id: null, labelKo: null };
}

/**
 * Force previous Diff into the turn pack, then overlay live SSOT.
 */
export function resolveLodgingDiffForPack(input: {
  readonly contextEventId: string;
  readonly graph: SessionGraphV1 | null;
  readonly previous?: ContextPackLodgingDiff | null;
}): ContextPackLodgingDiff | null {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return null;
  }

  const previous = input.previous ?? null;
  const event = findLifeEventCandidate(contextEventId);
  const slots = event ? readLodgingBookingSlots(event) : null;
  const picked = pickSelectedLodging(input.graph);
  const batch = readContextConditionLastBatch(contextEventId);
  const maxNightlyPriceKrw =
    typeof batch?.spec?.maxNightlyPriceKrw === "number" &&
    Number.isFinite(batch.spec.maxNightlyPriceKrw)
      ? batch.spec.maxNightlyPriceKrw
      : (previous?.maxNightlyPriceKrw ?? null);

  const checkInIso = slots?.checkInIso ?? previous?.checkInIso ?? null;
  const checkOutIso = slots?.checkOutIso ?? previous?.checkOutIso ?? null;
  const nights =
    nightsBetween(checkInIso, checkOutIso) ??
    previous?.nights ??
    null;
  const guestCount =
    slots?.guestCount ?? previous?.guestCount ?? null;
  const roomCount =
    slots?.roomCount ?? previous?.roomCount ?? null;

  const selectedLodgingId =
    picked.id ?? previous?.selectedLodgingId ?? null;
  const selectedLodgingLabelKo =
    picked.labelKo ?? previous?.selectedLodgingLabelKo ?? null;
  const lastBatchId =
    batch?.batchId?.trim() || previous?.lastBatchId || null;
  const lastBatchPlaceIds = [
    ...new Set(
      (batch?.recommendations ?? [])
        .map((row) => row.placeId?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const placeIds =
    lastBatchPlaceIds.length > 0
      ? lastBatchPlaceIds
      : (previous?.lastBatchPlaceIds ?? []);

  const empty =
    !checkInIso &&
    !checkOutIso &&
    nights == null &&
    guestCount == null &&
    !selectedLodgingId &&
    !lastBatchId &&
    placeIds.length === 0;

  if (empty) {
    return null;
  }

  return {
    selectedLodgingId,
    selectedLodgingLabelKo,
    selectedPinId: selectedLodgingId,
    checkInIso,
    checkOutIso,
    nights,
    guestCount,
    roomCount,
    lastBatchId,
    lastBatchPlaceIds: placeIds,
    maxNightlyPriceKrw,
  };
}
