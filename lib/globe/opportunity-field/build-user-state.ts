import type { UserStateV1 } from "@/lib/globe/opportunity-field/types";
import { OPPORTUNITY_GPS_FRESH_MS } from "@/lib/globe/opportunity-field/observation-constants";

export function buildUserStateV1(input: {
  lat?: number | null;
  lng?: number | null;
  capturedAtIso?: string | null;
  primaryEventId?: string | null;
  now?: Date;
}): UserStateV1 {
  const now = input.now ?? new Date();
  const lat = input.lat ?? null;
  const lng = input.lng ?? null;
  let gpsFresh = false;
  if (lat != null && lng != null && input.capturedAtIso?.trim()) {
    const ms = Date.parse(input.capturedAtIso);
    if (!Number.isNaN(ms) && now.getTime() - ms <= OPPORTUNITY_GPS_FRESH_MS) {
      gpsFresh = true;
    }
  }

  return {
    lat,
    lng,
    gpsFresh,
    primaryEventId: input.primaryEventId?.trim() || null,
    now,
  };
}
