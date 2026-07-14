/**
 * Prefer utterance spatial (도쿄역) over session lens / hotel POV when present.
 */
import type { DiscoverySearchOrigin } from "@/lib/globe/discovery-lens/types";
import { DISCOVERY_LENS_DEFAULT_RADIUS_M } from "@/lib/globe/discovery-lens/constants";
import { resolveSpatialTargetFromText } from "@/lib/globe/spatial/resolve-spatial-target-from-text";
import {
  normalizeScoutUtterance,
  parseUtteranceIntentSlots,
} from "@/lib/globe/context-condition-ai/utterance-intent-slots";

const STATION_NEAR_RADIUS_M = 1200;

/** When user names a station / place, that wins as scout origin. */
export function resolveDiscoveryOriginFromUtterance(
  message: string,
  fallback: DiscoverySearchOrigin | null = null,
): DiscoverySearchOrigin | null {
  const text = normalizeScoutUtterance(message);
  if (!text) {
    return fallback;
  }
  const slots = parseUtteranceIntentSlots(text);
  const probe =
    slots.stationHint?.trim() ||
    (/[가-힣A-Za-z0-9]{2,16}역/u.exec(text)?.[0] ?? null) ||
    slots.areaHint?.trim() ||
    text;
  const spatial = resolveSpatialTargetFromText(probe) ?? resolveSpatialTargetFromText(text);
  if (!spatial) {
    return fallback;
  }
  const nearStation = Boolean(slots.stationHint) || /역|station|駅/iu.test(text);
  return {
    lat: spatial.lat,
    lng: spatial.lng,
    regionLabel: spatial.label,
    radiusM: nearStation
      ? Math.max(fallback?.radiusM ?? 0, STATION_NEAR_RADIUS_M)
      : fallback?.radiusM ?? DISCOVERY_LENS_DEFAULT_RADIUS_M,
    lensId: fallback?.lensId ?? null,
  };
}
