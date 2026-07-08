import {
  DISCOVERY_LENS_MAX_RADIUS_M,
  DISCOVERY_LENS_MIN_RADIUS_M,
} from "@/lib/globe/discovery-lens/constants";
import type { DiscoveryLensId } from "@/lib/globe/discovery-lens/types";
import { DISCOVERY_LENS_IDS } from "@/lib/globe/discovery-lens/types";

export type ParsedLensCommand =
  | { readonly kind: "select"; readonly lensId: DiscoveryLensId }
  | { readonly kind: "resize_delta"; readonly deltaM: number }
  | { readonly kind: "resize_set"; readonly radiusM: number }
  | {
      readonly kind: "move_query";
      readonly query: string;
    }
  | {
      readonly kind: "move_offset";
      readonly bearing: "north" | "south" | "east" | "west";
      readonly distanceM: number;
    };

function parseLensId(text: string): DiscoveryLensId | null {
  const match = text.match(/\b([abc])\s*렌즈/iu);
  if (!match?.[1]) {
    return null;
  }
  const id = match[1].toLowerCase();
  return DISCOVERY_LENS_IDS.includes(id as DiscoveryLensId)
    ? (id as DiscoveryLensId)
    : null;
}

function parseMeters(raw: string, unit: string | undefined): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (unit?.toLowerCase() === "km" || unit === "킬로" || unit === "㎞") {
    return Math.round(value * 1000);
  }
  return Math.round(value);
}

function clampRadius(radiusM: number): number {
  return Math.min(
    DISCOVERY_LENS_MAX_RADIUS_M,
    Math.max(DISCOVERY_LENS_MIN_RADIUS_M, radiusM),
  );
}

/** Deterministic NL → lens manipulation (orchestrator-free v1). */
export function parseLensCommand(text: string): ParsedLensCommand | null {
  const raw = text.trim();
  if (!raw) {
    return null;
  }

  const lensId = parseLensId(raw);
  if (lensId && /^(?:[abc]\s*렌즈|렌즈\s*[abc])\s*$/iu.test(raw)) {
    return { kind: "select", lensId };
  }

  if (lensId && !/반경|이동|옮|늘|줄|확|축|north|south|east|west|위|아래|동|서|북|남/iu.test(raw)) {
    return { kind: "select", lensId };
  }

  const resizeUp = raw.match(
    /반경\s*(\d+(?:\.\d+)?)\s*(km|m|킬로|미터|㎞)?\s*(올려|늘려|확대|키워|up)/iu,
  );
  if (resizeUp) {
    const delta = parseMeters(resizeUp[1]!, resizeUp[2]);
    if (delta > 0) {
      return { kind: "resize_delta", deltaM: delta };
    }
  }

  const resizeDown = raw.match(
    /반경\s*(\d+(?:\.\d+)?)\s*(km|m|킬로|미터|㎞)?\s*(내려|줄여|축소|down)/iu,
  );
  if (resizeDown) {
    const delta = parseMeters(resizeDown[1]!, resizeDown[2]);
    if (delta > 0) {
      return { kind: "resize_delta", deltaM: -delta };
    }
  }

  const resizeSet = raw.match(
    /반경\s*(\d+(?:\.\d+)?)\s*(km|m|킬로|미터|㎞)?/iu,
  );
  if (resizeSet && /렌즈|반경/iu.test(raw)) {
    const radiusM = parseMeters(resizeSet[1]!, resizeSet[2]);
    if (radiusM > 0) {
      return { kind: "resize_set", radiusM: clampRadius(radiusM) };
    }
  }

  if (/사람.*많|번화가|핫플|북적|crowd|busy|nightlife/iu.test(raw)) {
    return { kind: "move_query", query: "번화가" };
  }

  if (/조용|한적|quiet|calm/iu.test(raw) && /렌즈|이동|옮/iu.test(raw)) {
    return { kind: "move_query", query: "조용한 공원" };
  }

  const direction = raw.match(
    /(위|북|north|아래|남|south|동|east|서|west)\s*(?:쪽)?\s*(?:으로)?\s*(\d+(?:\.\d+)?)?\s*(km|m|킬로|미터|㎞)?/iu,
  );
  if (direction && /렌즈|이동|옮|옮겨/iu.test(raw)) {
    const distanceM = direction[2]
      ? parseMeters(direction[2], direction[3])
      : 800;
    const token = direction[1]!.toLowerCase();
    const bearing =
      token.includes("위") || token.includes("북") || token === "north"
        ? "north"
        : token.includes("아") || token.includes("남") || token === "south"
          ? "south"
          : token.includes("동") || token === "east"
            ? "east"
            : "west";
    return { kind: "move_offset", bearing, distanceM };
  }

  if (lensId) {
    return { kind: "select", lensId };
  }

  return null;
}

export function offsetLatLng(input: {
  lat: number;
  lng: number;
  bearing: "north" | "south" | "east" | "west";
  distanceM: number;
}): { lat: number; lng: number } {
  const metersPerDegLat = 111_320;
  const metersPerDegLng =
    111_320 * Math.max(0.35, Math.cos((input.lat * Math.PI) / 180));
  const dLat =
    input.bearing === "north"
      ? input.distanceM / metersPerDegLat
      : input.bearing === "south"
        ? -input.distanceM / metersPerDegLat
        : 0;
  const dLng =
    input.bearing === "east"
      ? input.distanceM / metersPerDegLng
      : input.bearing === "west"
        ? -input.distanceM / metersPerDegLng
        : 0;
  return { lat: input.lat + dLat, lng: input.lng + dLng };
}
