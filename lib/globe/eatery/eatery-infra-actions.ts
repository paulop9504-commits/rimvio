import {
  buildGoogleMapsDirectionHref,
  buildGoogleMapsSearchHref,
  buildKakaoMapPlaceHref,
  buildKakaoMapPlaceWebHref,
  buildKakaoMapRouteHref,
  buildKakaoMapRouteWebHref,
} from "@/lib/resolvers/deep-links";
import { resolvePluginDeeplink } from "@/lib/action-spawn/resolve-plugin-deeplink";
import { isCoordInKorea } from "@/lib/resolvers/place-map-region";

export type EateryInfraRegion = "kr" | "jp" | "global";

export type EateryInfraAction = {
  id: "navigate" | "ride";
  label: string;
  href: string;
  fallbackHref?: string | null;
  tone: "primary" | "secondary";
};

type EateryInfraInput = {
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  mapsUrl?: string | null;
  contextPlace?: string | null;
  contextTitle?: string | null;
};

const JAPAN_BOUNDS = {
  minLat: 24,
  maxLat: 46.5,
  minLng: 122,
  maxLng: 146.5,
} as const;

const JAPAN_HINT =
  /일본|도쿄|오사카|교토|후쿠오카|나고야|삿포로|시부야|신주쿠|우메다|난바|긴자|\bjapan\b|\btokyo\b|\bosaka\b|\bkyoto\b|\bfukuoka\b|\bnagoya\b|\bsapporo\b|\bshibuya\b|\bshinjuku\b|\bumeda\b|\bnamba\b|\bginza\b/i;

function isCoordInJapan(lat: number, lng: number): boolean {
  return (
    lat >= JAPAN_BOUNDS.minLat &&
    lat <= JAPAN_BOUNDS.maxLat &&
    lng >= JAPAN_BOUNDS.minLng &&
    lng <= JAPAN_BOUNDS.maxLng
  );
}

function resolveQuery(input: EateryInfraInput): string {
  return [input.name.trim(), input.address?.trim()].filter(Boolean).join(" ").trim() || input.name.trim();
}

export function resolveEateryInfraRegion(input: EateryInfraInput): EateryInfraRegion {
  if (isCoordInKorea(input.lat, input.lng)) {
    return "kr";
  }
  if (isCoordInJapan(input.lat, input.lng)) {
    return "jp";
  }
  const haystack = [input.contextPlace, input.contextTitle, input.name, input.address]
    .filter(Boolean)
    .join(" ");
  if (JAPAN_HINT.test(haystack)) {
    return "jp";
  }
  return "global";
}

export function buildUberRideHref(input: EateryInfraInput): string {
  const params = new URLSearchParams();
  params.set("action", "setPickup");
  params.set("pickup", "my_location");
  params.set("dropoff[formatted_address]", resolveQuery(input));
  params.set("dropoff[latitude]", String(input.lat));
  params.set("dropoff[longitude]", String(input.lng));
  params.set("dropoff[nickname]", input.name.trim());
  return `uber://?${params.toString()}`;
}

export function buildUberRideWebHref(input: EateryInfraInput): string {
  const params = new URLSearchParams();
  params.set("action", "setPickup");
  params.set("pickup", "my_location");
  params.set("dropoff[formatted_address]", resolveQuery(input));
  params.set("dropoff[latitude]", String(input.lat));
  params.set("dropoff[longitude]", String(input.lng));
  params.set("dropoff[nickname]", input.name.trim());
  return `https://m.uber.com/ul/?${params.toString()}`;
}

export function buildEateryInfraActions(input: EateryInfraInput): EateryInfraAction[] {
  const region = resolveEateryInfraRegion(input);
  const query = resolveQuery(input);

  if (region === "kr") {
    return [
      {
        id: "navigate",
        label: "카카오맵",
        href: buildKakaoMapPlaceHref({
          lat: input.lat,
          lng: input.lng,
          placeLabel: input.name,
        }),
        fallbackHref: buildKakaoMapPlaceWebHref({
          lat: input.lat,
          lng: input.lng,
          placeLabel: input.name,
        }),
        tone: "primary",
      },
      {
        id: "ride",
        label: "카카오T",
        href:
          resolvePluginDeeplink("kakao.taxi", {
            destination: query,
            label: input.name,
          }) ?? `https://taxi.kakao.com/?dest=${encodeURIComponent(query)}`,
        tone: "secondary",
      },
    ];
  }

  const googleSource = input.mapsUrl?.trim() || buildGoogleMapsSearchHref(query);
  return [
    {
      id: "navigate",
      label: "Google Maps",
      href: buildGoogleMapsDirectionHref(googleSource),
      tone: "primary",
    },
    {
      id: "ride",
      label: "Uber",
      href: buildUberRideHref(input),
      fallbackHref: buildUberRideWebHref(input),
      tone: "secondary",
    },
  ];
}
