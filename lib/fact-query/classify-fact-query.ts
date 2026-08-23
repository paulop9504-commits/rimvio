import type { FactQueryClassification, FactQueryKind } from "@/lib/fact-query/types";
import {
  looksLikeDistanceAsk,
} from "@/lib/fact-query/tools/lookup-tools";
import { looksLikeScheduleFeasibilityAsk } from "@/lib/fact-query/tools/schedule-feasibility";
import {
  looksLikeTransitLastTrainAsk,
  looksLikeTransitRouteAsk,
} from "@/lib/fact-query/tools/gtfs-transit-tools";
import { looksLikeMidpointMeetingAsk } from "@/lib/fact-query/tools/midpoint-meeting";
import { looksLikeTransitRealtimeAsk } from "@/lib/fact-query/tools/gtfs-rt-tools";
import { looksLikeTransitCrowdingAsk } from "@/lib/fact-query/tools/transit-crowding-tools";
import { looksLikeWeatherFactAsk } from "@/lib/context-run/try-fetch-weather-fact-reply";

const CITY_TOKENS: readonly { readonly id: string; readonly labelKo: string; readonly re: RegExp }[] = [
  { id: "tokyo", labelKo: "도쿄", re: /도쿄|東京|tokyo|일본\s*수도/u },
  { id: "osaka", labelKo: "오사카", re: /오사카|大阪|osaka/u },
  { id: "seoul", labelKo: "서울", re: /서울|seoul/u },
];

function detectCity(text: string): { id: string; labelKo: string } | null {
  for (const row of CITY_TOKENS) {
    if (row.re.test(text)) {
      return { id: row.id, labelKo: row.labelKo };
    }
  }
  return null;
}

function classifyKind(text: string, cityId: string | null): FactQueryKind {
  const t = text.trim();

  if (
    looksLikeWeatherFactAsk(t) ||
    /(?:오늘|내일|모레).*(?:비|날씨|기온)|(?:비)\s*(?:와|올|오|내)/iu.test(t)
  ) {
    return "weather_lookup";
  }

  if (looksLikeDistanceAsk(t)) {
    return "distance_lookup";
  }

  if (looksLikeScheduleFeasibilityAsk(t)) {
    return "schedule_feasibility";
  }

  if (looksLikeTransitLastTrainAsk(t)) {
    return "transit_last_train";
  }

  if (looksLikeTransitCrowdingAsk(t)) {
    return "transit_crowding_lookup";
  }

  if (looksLikeTransitRealtimeAsk(t)) {
    return "transit_realtime_lookup";
  }

  if (looksLikeTransitRouteAsk(t)) {
    return "transit_route_lookup";
  }

  if (looksLikeMidpointMeetingAsk(t)) {
    return "midpoint_meeting";
  }

  if (
    /(?:환승|교차).*(?:많|최다|제일|가장)|(?:많|최다|제일|가장).*(?:환승|교차|노선)|max.*interchange|most.*line/iu.test(
      t,
    ) &&
    (cityId === "tokyo" ||
      cityId === "osaka" ||
      cityId === "seoul" ||
      /지하철|metro|subway|地下鉄|노선/iu.test(t))
  ) {
    return "transit_max_interchange";
  }

  if (
    /(?:핫|hot|인기|유명|must|트렌드|핫플|가볼\s*만|best\s*spot)/iu.test(t) &&
    cityId
  ) {
    return "poi_hotspots";
  }

  if (/(?:몇\s*호선|노선\s*뭐|어떤\s*노선)/iu.test(t) && /역/u.test(t)) {
    return "transit_station_lines";
  }

  return "unsupported";
}

export function classifyFactQuery(utterance: string): FactQueryClassification {
  const text = utterance.trim();
  const city = detectCity(text);
  const kind = classifyKind(text, city?.id ?? null);
  return {
    kind,
    cityLabelKo: city?.labelKo ?? null,
    cityId: city?.id ?? null,
    recipientQuery: null,
  };
}

export function isFactQueryUtterance(utterance: string): boolean {
  const c = classifyFactQuery(utterance);
  return c.kind !== "unsupported";
}
