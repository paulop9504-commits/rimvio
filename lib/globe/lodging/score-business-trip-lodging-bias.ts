import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import { inferLodgingContextMode } from "@/lib/globe/lodging/build-lodging-dynamic-tags";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

export type BusinessTripLodgingScoreBias = {
  readonly delta: number;
  readonly reasons: readonly string[];
};

const STATION_CUE =
  /(?:역|station|terminal|서면|센텀|범일|부전|해운대역|남포|김해공항|공항|airport)/iu;
const BUSINESS_CUE =
  /(?:비즈니스|business|호텔|hotel|스위트|suite|조용|quiet|체크인|check[\s-]?in)/iu;
const LEISURE_CUE =
  /(?:리조트|resort|바다|beach|오션|ocean|풀|pool|스파|spa|감성|뷰|view)/iu;

function readMeetingAnchor(event: EventCandidate | null | undefined): {
  lat: number;
  lng: number;
} | null {
  if (!event) {
    return null;
  }
  const plan = readPlanContextFromEvent(event);
  const place = plan?.place?.trim() || event.place?.trim();
  if (!place) {
    return null;
  }
  return null;
}

/** 출장 프로필 — 역·미팅 동선·실용 숙소 bias. */
export function scoreBusinessTripLodgingBias(input: {
  row: ContextLodgingInventoryRow;
  event?: EventCandidate | null;
  povLat?: number | null;
  povLng?: number | null;
}): BusinessTripLodgingScoreBias {
  const event = input.event;
  if (!event || inferLodgingContextMode(event) !== "business_trip") {
    return { delta: 0, reasons: [] };
  }

  const blob = [input.row.name, input.row.address, input.row.partnerLabel]
    .filter(Boolean)
    .join(" ");
  let delta = 0;
  const reasons: string[] = [];

  const lat = input.povLat ?? null;
  const lng = input.povLng ?? null;
  if (lat != null && lng != null) {
    const distanceKm = haversineKm(lat, lng, input.row.lat, input.row.lng);
    if (distanceKm <= 0.8) {
      delta += 36;
      reasons.push("서면 중심 동선에 가까워요");
    } else if (distanceKm <= 2) {
      delta += 22;
      reasons.push("업무 동선에서 무리 없는 거리예요");
    } else if (distanceKm > 8) {
      delta -= 18;
    }
  }

  if (STATION_CUE.test(blob)) {
    delta += 28;
    reasons.push("역·교통 허브 근처예요");
  }
  if (BUSINESS_CUE.test(blob)) {
    delta += 16;
    reasons.push("출장 흐름에 맞는 숙소예요");
  }
  if (LEISURE_CUE.test(blob)) {
    delta -= 24;
  }

  return { delta, reasons: reasons.slice(0, 2) };
}
