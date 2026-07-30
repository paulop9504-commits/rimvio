/**
 * Build ScheduleFeasibilityInput for Commit-time Verification (ADR-043).
 * Prefer stamped metadata; else lodging inventory + pinned eatery.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import {
  CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY,
} from "@/lib/globe/eatery/eatery-resource-types";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";
import type { ScheduleFeasibilityInput } from "@/lib/workstream/verification-agent";

export const COMMIT_SCHEDULE_FEASIBILITY_META_KEY =
  "commitScheduleFeasibilityV1" as const;

export type CommitScheduleFeasibilityWire = {
  readonly activityLabelKo: string;
  readonly activityLat: number;
  readonly activityLng: number;
  readonly leaveReadyMinutes?: number | null;
  readonly activityCloseMinutes?: number | null;
  readonly transitKmh?: number;
  readonly maxTravelMinutes?: number;
  readonly anchorLabelKo?: string;
  readonly anchorLat?: number;
  readonly anchorLng?: number;
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, "");
}

function readFeasibilityWire(
  metadata: Record<string, unknown> | null | undefined,
): CommitScheduleFeasibilityWire | null {
  const raw = metadata?.[COMMIT_SCHEDULE_FEASIBILITY_META_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const activityLabelKo =
    typeof row.activityLabelKo === "string" ? row.activityLabelKo.trim() : "";
  const activityLat =
    typeof row.activityLat === "number" && Number.isFinite(row.activityLat)
      ? row.activityLat
      : null;
  const activityLng =
    typeof row.activityLng === "number" && Number.isFinite(row.activityLng)
      ? row.activityLng
      : null;
  if (!activityLabelKo || activityLat == null || activityLng == null) {
    return null;
  }
  return {
    activityLabelKo,
    activityLat,
    activityLng,
    leaveReadyMinutes:
      typeof row.leaveReadyMinutes === "number" ? row.leaveReadyMinutes : null,
    activityCloseMinutes:
      typeof row.activityCloseMinutes === "number"
        ? row.activityCloseMinutes
        : null,
    transitKmh: typeof row.transitKmh === "number" ? row.transitKmh : undefined,
    maxTravelMinutes:
      typeof row.maxTravelMinutes === "number"
        ? row.maxTravelMinutes
        : undefined,
    anchorLabelKo:
      typeof row.anchorLabelKo === "string" ? row.anchorLabelKo.trim() : undefined,
    anchorLat:
      typeof row.anchorLat === "number" && Number.isFinite(row.anchorLat)
        ? row.anchorLat
        : undefined,
    anchorLng:
      typeof row.anchorLng === "number" && Number.isFinite(row.anchorLng)
        ? row.anchorLng
        : undefined,
  };
}

/** Resolve lodging coords from Commit ops + inventory. */
export function resolveLodgingAnchorFromCommitOps(input: {
  readonly event: EventCandidate | null;
  readonly operations: readonly RealityOperationV1[];
}): {
  readonly labelKo: string;
  readonly lat: number;
  readonly lng: number;
} | null {
  const lodgingOps = input.operations.filter(
    (op) => op.kind === "lodging" || op.type === "booking_prep",
  );
  if (lodgingOps.length === 0) return null;

  const rows = input.event ? readLodgingInventoryRows(input.event) : [];
  for (const op of lodgingOps) {
    const resourceId = op.preview.resourceId?.trim() ?? "";
    const placeLabel =
      op.preview.placeLabelKo?.trim() || op.labelKo.trim() || "";
    const placeId = op.sourceRef?.trim() || "";
    const match = rows.find((row) => {
      if (placeId && (row.placeId === placeId || row.liteapiHotelId === placeId)) {
        return true;
      }
      if (resourceId && resourceId.includes(row.placeId)) return true;
      if (
        placeLabel &&
        (normalize(row.name) === normalize(placeLabel) ||
          normalize(row.name).includes(normalize(placeLabel)) ||
          normalize(placeLabel).includes(normalize(row.name)))
      ) {
        return true;
      }
      return false;
    });
    if (match) {
      return {
        labelKo: placeLabel || match.name,
        lat: match.lat,
        lng: match.lng,
      };
    }
  }

  // Fallback: first inventory row when a lodging op exists but labels don't match.
  const first = rows[0];
  if (first) {
    const op = lodgingOps[0]!;
    return {
      labelKo:
        op.preview.placeLabelKo?.trim() ||
        op.labelKo.trim() ||
        first.name,
      lat: first.lat,
      lng: first.lng,
    };
  }
  return null;
}

function resolveActivityFromEatery(
  event: EventCandidate | null,
): { labelKo: string; lat: number; lng: number } | null {
  if (!event) return null;
  const rows = readEateryInventoryRows(event);
  if (rows.length === 0) return null;
  const pinnedPlaceId =
    typeof event.metadata?.[CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY] === "string"
      ? String(event.metadata[CONTEXT_EATERY_PINNED_PLACE_ID_META_KEY]).trim()
      : "";
  const pinned = pinnedPlaceId
    ? rows.find((row) => row.placeId === pinnedPlaceId)
    : null;
  const pick = pinned ?? rows[0]!;
  return { labelKo: pick.name, lat: pick.lat, lng: pick.lng };
}

/**
 * Build feasibility for Verification Agent, or null when coords unavailable
 * (do not false-block Commit).
 */
export function buildCommitScheduleFeasibility(input: {
  readonly event: EventCandidate | null;
  readonly operations: readonly RealityOperationV1[];
}): ScheduleFeasibilityInput | null {
  const wire = readFeasibilityWire(input.event?.metadata ?? null);
  const lodging = resolveLodgingAnchorFromCommitOps(input);

  const anchorLabelKo =
    wire?.anchorLabelKo?.trim() || lodging?.labelKo || null;
  const anchorLat = wire?.anchorLat ?? lodging?.lat ?? null;
  const anchorLng = wire?.anchorLng ?? lodging?.lng ?? null;

  let activityLabelKo = wire?.activityLabelKo ?? null;
  let activityLat = wire?.activityLat ?? null;
  let activityLng = wire?.activityLng ?? null;

  if (activityLat == null || activityLng == null || !activityLabelKo) {
    const eatery = resolveActivityFromEatery(input.event);
    if (eatery) {
      activityLabelKo = eatery.labelKo;
      activityLat = eatery.lat;
      activityLng = eatery.lng;
    }
  }

  if (
    !anchorLabelKo ||
    anchorLat == null ||
    anchorLng == null ||
    !activityLabelKo ||
    activityLat == null ||
    activityLng == null
  ) {
    return null;
  }

  return {
    activityLabelKo,
    activityLat,
    activityLng,
    anchorLabelKo,
    anchorLat,
    anchorLng,
    leaveReadyMinutes: wire?.leaveReadyMinutes ?? null,
    activityCloseMinutes: wire?.activityCloseMinutes ?? null,
    transitKmh: wire?.transitKmh,
    maxTravelMinutes: wire?.maxTravelMinutes,
  };
}
