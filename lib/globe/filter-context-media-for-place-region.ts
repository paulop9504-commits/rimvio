import type { EventCandidate } from "@/lib/events/event-candidate";
import { readCanonicalPlaceProfileFromEvent } from "@/lib/globe/canonical-place-profile";
import { inferCountryCodeFromCoords } from "@/lib/globe/geo-region-from-coords";
import type { CountryCode } from "@/lib/links/spark-locale";
import { readMediaContextMemorySnapshot } from "@/lib/location-ping/media-context-store";

const JP_TEXT =
  /japan|osaka|tokyo|kyoto|namba|umeda|shinjuku|shibuya|fukuoka|sapporo|도쿄|오사카|교토|난바|우메다|신주쿠|시부야|후쿠오카|삿포로|일본/iu;
const KR_TEXT =
  /south\s*korea|korea(?!n barbecue)|seoul|busan|incheon|daejeon|daegu|ulsan|jeju|서울|부산|인천|대전|대구|울산|제주|대한민국|한국|망원|홍대|강남|이태원|성수/iu;

export type ContextMediaRegionProbe = {
  placeLabel?: string | null;
  label?: string | null;
  lat?: number | null;
  lng?: number | null;
};

function normalizeProbeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

export function resolveEventAnchorCountryCode(
  event: EventCandidate | null | undefined,
): CountryCode | null {
  if (!event) {
    return null;
  }
  return readCanonicalPlaceProfileFromEvent(event)?.countryCode ?? null;
}

export function inferMediaRegionCountryCode(
  probe: ContextMediaRegionProbe,
): CountryCode | null {
  const lat = probe.lat;
  const lng = probe.lng;
  if (
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    typeof lng === "number" &&
    Number.isFinite(lng)
  ) {
    const fromCoords = inferCountryCodeFromCoords(lat, lng);
    if (fromCoords) {
      return fromCoords;
    }
  }

  const text = normalizeProbeText(
    `${probe.placeLabel ?? ""} ${probe.label ?? ""}`,
  );
  if (!text) {
    return null;
  }
  if (JP_TEXT.test(text)) {
    return "JP";
  }
  if (KR_TEXT.test(text)) {
    return "KR";
  }
  return null;
}

/** KR/JP contexts reject captures whose coords or labels clearly belong to the other country. */
export function mediaMatchesEventPlaceRegion(
  event: EventCandidate | null | undefined,
  probe: ContextMediaRegionProbe,
): boolean {
  const eventCountry = resolveEventAnchorCountryCode(event);
  if (!eventCountry || (eventCountry !== "KR" && eventCountry !== "JP")) {
    return true;
  }

  const mediaCountry = inferMediaRegionCountryCode(probe);
  if (!mediaCountry || (mediaCountry !== "KR" && mediaCountry !== "JP")) {
    return true;
  }

  return mediaCountry === eventCountry;
}

export function resolveCaptureRegionProbe(input: {
  placeLabel?: string | null;
  label?: string | null;
  mediaContextId?: string | null;
}): ContextMediaRegionProbe {
  const mediaId = input.mediaContextId?.trim();
  const storeRow = mediaId
    ? readMediaContextMemorySnapshot().find((row) => row.id.trim() === mediaId)
    : null;

  return {
    placeLabel: input.placeLabel ?? storeRow?.placeLabel ?? null,
    label: input.label ?? null,
    lat: storeRow?.lat ?? null,
    lng: storeRow?.lng ?? null,
  };
}
