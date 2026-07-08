import { haversineKm } from "@/lib/feed/spacetime-fit";
import {
  buildDiscoveryLensLodgingPickAnnouncement,
  buildDiscoveryLensPickAnnouncement,
} from "@/lib/globe/discovery-lens/build-discovery-lens-announcements";
import {
  DISCOVERY_LENS_MAX_RADIUS_M,
  DISCOVERY_LENS_MIN_RADIUS_M,
} from "@/lib/globe/discovery-lens/constants";
import {
  readDiscoveryLensSession,
  publishDiscoveryLensAction,
} from "@/lib/globe/discovery-lens/lens-session-bridge";
import {
  moveActiveDiscoveryLens,
  resizeActiveDiscoveryLens,
  setActiveDiscoveryLens,
} from "@/lib/globe/discovery-lens/spawn-discovery-lenses";
import type { DiscoveryLensId } from "@/lib/globe/discovery-lens/types";
import { fetchGlobeContextPlaceGeocode } from "@/lib/globe/align-globe-context-places";
import {
  offsetLatLng,
  parseLensCommand,
  type ParsedLensCommand,
} from "@/lib/globe/discovery-lens/parse-lens-command";

function clampRadius(radiusM: number): number {
  return Math.min(
    DISCOVERY_LENS_MAX_RADIUS_M,
    Math.max(DISCOVERY_LENS_MIN_RADIUS_M, radiusM),
  );
}

export async function applyLensCommand(input: {
  contextEventId: string;
  text: string;
  region?: string | null;
}): Promise<{ handled: boolean; replyKo?: string }> {
  const command = parseLensCommand(input.text);
  if (!command) {
    return { handled: false };
  }

  const session = readDiscoveryLensSession(input.contextEventId);
  if (!session || session.lenses.length === 0) {
    return { handled: false };
  }

  const result = await executeLensCommand({
    command,
    session,
    region: input.region,
  });
  if (!result) {
    return { handled: false };
  }

  publishDiscoveryLensAction(input.contextEventId, {
    type: "activate",
    lensId: result.activeLensId,
    rescout: result.rescout,
  });

  return { handled: true, replyKo: result.replyKo };
}

async function executeLensCommand(input: {
  command: ParsedLensCommand;
  session: ReturnType<typeof readDiscoveryLensSession>;
  region?: string | null;
}): Promise<{
  activeLensId: string;
  rescout: boolean;
  replyKo: string;
} | null> {
  const session = input.session;
  if (!session) {
    return null;
  }

  switch (input.command.kind) {
    case "select": {
      const lensId = input.command.lensId;
      const next = setActiveDiscoveryLens({
        session,
        lensId,
      });
      const lens = next.lenses.find((row) => row.id === lensId);
      return {
        activeLensId: lensId,
        rescout: true,
        replyKo: lens
          ? `${lens.labelKo} 렌즈로 볼게요.`
          : `${lensId} 렌즈로 볼게요.`,
      };
    }
    case "resize_delta": {
      const active = session.lenses.find((row) => row.id === session.activeLensId);
      if (!active || !session.activeLensId) {
        return null;
      }
      const radiusM = clampRadius(active.radiusM + input.command.deltaM);
      resizeActiveDiscoveryLens({ session, radiusM });
      return {
        activeLensId: session.activeLensId,
        rescout: true,
        replyKo: `반경을 ${Math.round(radiusM / 100) / 10}km로 맞췄어요.`,
      };
    }
    case "resize_set": {
      if (!session.activeLensId) {
        return null;
      }
      resizeActiveDiscoveryLens({
        session,
        radiusM: input.command.radiusM,
      });
      return {
        activeLensId: session.activeLensId,
        rescout: true,
        replyKo: `반경 ${Math.round(input.command.radiusM / 100) / 10}km로 찾을게요.`,
      };
    }
    case "move_offset": {
      const active = session.lenses.find((row) => row.id === session.activeLensId);
      if (!active || !session.activeLensId) {
        return null;
      }
      const center = offsetLatLng({
        lat: active.center.lat,
        lng: active.center.lng,
        bearing: input.command.bearing,
        distanceM: input.command.distanceM,
      });
      moveActiveDiscoveryLens({ session, ...center });
      return {
        activeLensId: session.activeLensId,
        rescout: true,
        replyKo: "렌즈를 옮겼어요. 이 주변으로 다시 볼게요.",
      };
    }
    case "move_query": {
      const active = session.lenses.find((row) => row.id === session.activeLensId);
      if (!active || !session.activeLensId) {
        return null;
      }
      const region = input.region?.trim();
      const query = region
        ? `${region} ${input.command.query}`
        : input.command.query;
      const resolved = await fetchGlobeContextPlaceGeocode({
        place: query,
        userLat: active.center.lat,
        userLng: active.center.lng,
      });
      if (
        !resolved ||
        !Number.isFinite(resolved.lat) ||
        !Number.isFinite(resolved.lng)
      ) {
        return {
          activeLensId: session.activeLensId,
          rescout: false,
          replyKo: "그쪽 위치를 아직 못 잡았어요. 지도에서 렌즈를 눌러 주세요.",
        };
      }
      moveActiveDiscoveryLens({
        session,
        lat: resolved.lat,
        lng: resolved.lng,
      });
      return {
        activeLensId: session.activeLensId,
        rescout: true,
        replyKo: `${resolved.placeName?.trim() || input.command.query} 쪽으로 렌즈를 옮겼어요.`,
      };
    }
    default:
      return null;
  }
}

export function handleDiscoveryLensGlobePress(input: {
  contextEventId: string;
  lat: number;
  lng: number;
}): boolean {
  const session = readDiscoveryLensSession(input.contextEventId);
  if (!session || session.lenses.length === 0) {
    return false;
  }

  let nearest: { id: DiscoveryLensId; distanceM: number } | null = null;
  for (const lens of session.lenses) {
    const distanceM =
      haversineKm(input.lat, input.lng, lens.center.lat, lens.center.lng) *
      1000;
    if (distanceM <= lens.radiusM * 1.15) {
      if (!nearest || distanceM < nearest.distanceM) {
        nearest = { id: lens.id, distanceM };
      }
    }
  }

  if (nearest) {
    setActiveDiscoveryLens({ session, lensId: nearest.id });
    publishDiscoveryLensAction(input.contextEventId, {
      type: "activate",
      lensId: nearest.id,
      rescout: true,
    });
    return true;
  }

  if (session.activeLensId) {
    moveActiveDiscoveryLens({
      session,
      lat: input.lat,
      lng: input.lng,
    });
    publishDiscoveryLensAction(input.contextEventId, {
      type: "move_active",
      lat: input.lat,
      lng: input.lng,
      rescout: true,
    });
    return true;
  }

  return false;
}

export function lensPickPromptKo(
  session: ReturnType<typeof readDiscoveryLensSession>,
): string | null {
  if (!session) {
    return null;
  }
  if (session.pendingSearchKind === "lodging") {
    return buildDiscoveryLensLodgingPickAnnouncement(session);
  }
  return buildDiscoveryLensPickAnnouncement(session);
}
