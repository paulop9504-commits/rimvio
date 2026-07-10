import { fetchGlobeContextPlaceGeocode } from "@/lib/globe/align-globe-context-places";
import {
  DISCOVERY_LENS_DEFAULT_RADIUS_M,
  DISCOVERY_LENS_MAX_COUNT,
} from "@/lib/globe/discovery-lens/constants";
import {
  publishDiscoveryLensSession,
  readDiscoveryLensSession,
} from "@/lib/globe/discovery-lens/lens-session-bridge";
import type {
  DiscoveryLens,
  DiscoveryLensId,
  DiscoveryLensSession,
} from "@/lib/globe/discovery-lens/types";
import { DISCOVERY_LENS_IDS } from "@/lib/globe/discovery-lens/types";

function regionPrefix(region: string | null | undefined): string {
  return region?.trim() || "";
}

async function geocodeLandmark(input: {
  landmark: string;
  region: string;
  hintLat?: number | null;
  hintLng?: number | null;
}): Promise<{ labelKo: string; lat: number; lng: number } | null> {
  const landmark = input.landmark.trim();
  if (!landmark) {
    return null;
  }
  const query = input.region ? `${input.region} ${landmark}`.trim() : landmark;
  const resolved = await fetchGlobeContextPlaceGeocode({
    place: query,
    userLat: input.hintLat ?? null,
    userLng: input.hintLng ?? null,
  });
  if (
    !resolved ||
    !Number.isFinite(resolved.lat) ||
    !Number.isFinite(resolved.lng)
  ) {
    return null;
  }
  return {
    labelKo:
      resolved.placeName?.trim() ||
      resolved.label?.trim() ||
      landmark,
    lat: resolved.lat,
    lng: resolved.lng,
  };
}

export async function spawnDiscoveryLenses(input: {
  contextEventId: string;
  region?: string | null;
  landmarks: readonly string[];
  spawnedFrom?: string | null;
  hintLat?: number | null;
  hintLng?: number | null;
  defaultRadiusM?: number;
}): Promise<DiscoveryLensSession | null> {
  const hints = input.landmarks
    .map((row) => row.trim())
    .filter((row) => row.length >= 2)
    .slice(0, DISCOVERY_LENS_MAX_COUNT);
  if (hints.length === 0) {
    return readDiscoveryLensSession(input.contextEventId);
  }

  const region = regionPrefix(input.region);
  const radiusM = input.defaultRadiusM ?? DISCOVERY_LENS_DEFAULT_RADIUS_M;
  const geocoded = await Promise.all(
    hints.map((landmark) =>
      geocodeLandmark({
        landmark,
        region,
        hintLat: input.hintLat,
        hintLng: input.hintLng,
      }),
    ),
  );

  const lenses: DiscoveryLens[] = [];
  for (const [index, row] of geocoded.entries()) {
    if (!row) {
      continue;
    }
    const id = DISCOVERY_LENS_IDS[index] as DiscoveryLensId | undefined;
    if (!id) {
      break;
    }
    lenses.push({
      id,
      labelKo: row.labelKo,
      center: { lat: row.lat, lng: row.lng },
      radiusM,
      spawnedFrom: input.spawnedFrom ?? null,
    });
  }

  if (lenses.length === 0) {
    return null;
  }

  const session: DiscoveryLensSession = {
    contextEventId: input.contextEventId.trim(),
    lenses,
    activeLensId: lenses[0]!.id,
    updatedAtIso: new Date().toISOString(),
    awaitingLensPick: false,
    pendingSearchKind: null,
  };
  publishDiscoveryLensSession(session);
  return session;
}

/** Known coords — skip geocode (hotel POV · pinned lodging). */
export function spawnDiscoveryLensAtCoords(input: {
  contextEventId: string;
  labelKo: string;
  lat: number;
  lng: number;
  radiusM?: number;
  spawnedFrom?: string | null;
}): DiscoveryLensSession | null {
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    return null;
  }
  const contextEventId = input.contextEventId.trim();
  const existing = readDiscoveryLensSession(contextEventId);
  if (existing?.lenses.length) {
    return existing;
  }
  const labelKo = input.labelKo.trim();
  if (!labelKo) {
    return null;
  }
  const radiusM = input.radiusM ?? DISCOVERY_LENS_DEFAULT_RADIUS_M;
  const lens: DiscoveryLens = {
    id: DISCOVERY_LENS_IDS[0]!,
    labelKo,
    center: { lat: input.lat, lng: input.lng },
    radiusM,
    spawnedFrom: input.spawnedFrom ?? null,
  };
  const session: DiscoveryLensSession = {
    contextEventId,
    lenses: [lens],
    activeLensId: lens.id,
    updatedAtIso: new Date().toISOString(),
    awaitingLensPick: false,
    pendingSearchKind: null,
  };
  publishDiscoveryLensSession(session);
  return session;
}

export function setActiveDiscoveryLens(input: {
  session: DiscoveryLensSession;
  lensId: DiscoveryLensId;
  awaitingLensPick?: boolean;
  pendingSearchKind?: DiscoveryLensSession["pendingSearchKind"];
}): DiscoveryLensSession {
  const next: DiscoveryLensSession = {
    ...input.session,
    activeLensId: input.lensId,
    awaitingLensPick: input.awaitingLensPick ?? false,
    pendingSearchKind: input.pendingSearchKind ?? null,
    updatedAtIso: new Date().toISOString(),
  };
  publishDiscoveryLensSession(next);
  return next;
}

export function moveActiveDiscoveryLens(input: {
  session: DiscoveryLensSession;
  lat: number;
  lng: number;
}): DiscoveryLensSession | null {
  const activeId = input.session.activeLensId;
  if (!activeId) {
    return null;
  }
  const lenses = input.session.lenses.map((lens) =>
    lens.id === activeId
      ? { ...lens, center: { lat: input.lat, lng: input.lng } }
      : lens,
  );
  const next: DiscoveryLensSession = {
    ...input.session,
    lenses,
    updatedAtIso: new Date().toISOString(),
  };
  publishDiscoveryLensSession(next);
  return next;
}

export function resizeActiveDiscoveryLens(input: {
  session: DiscoveryLensSession;
  radiusM: number;
}): DiscoveryLensSession | null {
  const activeId = input.session.activeLensId;
  if (!activeId) {
    return null;
  }
  const lenses = input.session.lenses.map((lens) =>
    lens.id === activeId ? { ...lens, radiusM: input.radiusM } : lens,
  );
  const next: DiscoveryLensSession = {
    ...input.session,
    lenses,
    updatedAtIso: new Date().toISOString(),
  };
  publishDiscoveryLensSession(next);
  return next;
}

export function markDiscoveryLensPickPending(input: {
  session: DiscoveryLensSession;
  pendingSearchKind: NonNullable<DiscoveryLensSession["pendingSearchKind"]>;
}): DiscoveryLensSession {
  const next: DiscoveryLensSession = {
    ...input.session,
    awaitingLensPick: true,
    pendingSearchKind: input.pendingSearchKind,
    updatedAtIso: new Date().toISOString(),
  };
  publishDiscoveryLensSession(next);
  return next;
}
