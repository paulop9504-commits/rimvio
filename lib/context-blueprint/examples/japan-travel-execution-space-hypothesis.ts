/**
 * Reference — "일본 여행" only (destination NOT confirmed by user).
 * Globe AI creates Execution Space skeleton + hypothesis candidates.
 * Does NOT pick Osaka/Tokyo/Fukuoka until user says so.
 */

import { composeExecutionSpaceSlot } from "@/lib/context-blueprint/execution-space-slots";
import {
  composeExecutionSpace,
  type ExecutionSpace,
} from "@/lib/context-blueprint/spatial-plan";

export function composeJapanTravelExecutionSpaceHypothesis(input?: {
  originLabel?: string;
  originLat?: number;
  originLng?: number;
}): ExecutionSpace {
  const origin = {
    id: "home-origin",
    label: input?.originLabel?.trim() || "Home",
    kind: "home" as const,
    lat: input?.originLat ?? 36.3504,
    lng: input?.originLng ?? 127.3845,
    zoneId: "zone-origin",
    resolution: "confirmed" as const,
    status: "active" as const,
    triggerRadiusM: 1200,
  };

  const anchors = [
    {
      id: "departure-airport",
      label: "Departure Airport",
      kind: "airport" as const,
      zoneId: "zone-transit",
      resolution: "hypothesis" as const,
      status: "planned" as const,
      triggerRadiusM: 2500,
    },
    {
      id: "arrival-japan",
      label: "Arrival (Japan)",
      kind: "airport" as const,
      zoneId: "zone-japan",
      resolution: "unresolved" as const,
      linkedSlotId: "destination",
      status: "planned" as const,
    },
    {
      id: "stay-area",
      label: "Stay Area",
      kind: "hotel_area" as const,
      zoneId: "zone-stay",
      resolution: "hypothesis" as const,
      linkedSlotId: "destination",
      status: "planned" as const,
    },
    {
      id: "activity-hub",
      label: "Activity Hub",
      kind: "poi" as const,
      zoneId: "zone-stay",
      resolution: "hypothesis" as const,
      optional: true,
      status: "planned" as const,
    },
  ] as const;

  const executionZones = [
    { id: "zone-origin", label: "Origin", countryCode: "KR" },
    { id: "zone-transit", label: "Transit", regionHint: "Airport" },
    { id: "zone-japan", label: "Japan", countryCode: "JP" },
    { id: "zone-stay", label: "Stay region", countryCode: "JP" },
  ] as const;

  const destinationSlot = composeExecutionSpaceSlot({
    slotId: "destination",
    role: "destination",
    label: "Destination",
    resolution: "unresolved",
    candidates: [
      {
        id: "osaka",
        label: "Osaka",
        lat: 34.6937,
        lng: 135.5023,
        countryCode: "JP",
        confidence: 0.55,
        reasonKo: "입국 후 활동 밀도가 높은 도시",
      },
      {
        id: "tokyo",
        label: "Tokyo",
        lat: 35.6762,
        lng: 139.6503,
        countryCode: "JP",
        confidence: 0.52,
        reasonKo: "첫 일본 여행에서 자주 선택",
      },
      {
        id: "fukuoka",
        label: "Fukuoka",
        lat: 33.5904,
        lng: 130.4017,
        countryCode: "JP",
        confidence: 0.48,
        reasonKo: "근거리·먹거리 중심 여행",
      },
    ],
  });

  return composeExecutionSpace({
    origin,
    anchors,
    executionZones,
    slots: [destinationSlot],
    expectedPathAnchorIds: [
      "home-origin",
      "departure-airport",
      "arrival-japan",
      "stay-area",
      "activity-hub",
      "stay-area",
      "departure-airport",
      "home-origin",
    ],
    status: "planning",
  });
}
