/**
 * Reference Execution Space — user stated "오사카" (destination confirmed).
 * Globe AI builds Spatial Execution Graph before hotel search — not search-first.
 */

import { composeExecutionSpaceSlot } from "@/lib/context-blueprint/execution-space-slots";
import {
  composeExecutionSpace,
  type ExecutionSpace,
} from "@/lib/context-blueprint/spatial-plan";

/** "10월에 일본 오사카 여행 갈래" → confirmed destination · full spatial graph. */
export function composeOsakaTravelExecutionSpace(): ExecutionSpace {
  const origin = {
    id: "home-daejeon",
    label: "Home (대한민국 대전)",
    kind: "home" as const,
    lat: 36.3504,
    lng: 127.3845,
    zoneId: "zone-korea",
    resolution: "confirmed" as const,
    status: "active" as const,
    triggerRadiusM: 1200,
  };

  const anchors = [
    {
      id: "incheon-airport",
      label: "Incheon Airport",
      kind: "airport" as const,
      lat: 37.4602,
      lng: 126.4407,
      zoneId: "zone-airport",
      resolution: "confirmed" as const,
      status: "planned" as const,
      triggerRadiusM: 2500,
    },
    {
      id: "kansai-airport",
      label: "Kansai Airport",
      kind: "airport" as const,
      lat: 34.4347,
      lng: 135.244,
      zoneId: "zone-airport",
      resolution: "confirmed" as const,
      linkedSlotId: "destination",
      status: "planned" as const,
      triggerRadiusM: 2500,
    },
    {
      id: "osaka-hotel-area",
      label: "Hotel Area (Osaka)",
      kind: "hotel_area" as const,
      lat: 34.6937,
      lng: 135.5023,
      zoneId: "zone-osaka-downtown",
      resolution: "confirmed" as const,
      linkedSlotId: "destination",
      status: "planned" as const,
      triggerRadiusM: 1500,
    },
    {
      id: "dotonbori",
      label: "Dotonbori",
      kind: "poi" as const,
      lat: 34.6687,
      lng: 135.5013,
      zoneId: "zone-osaka-downtown",
      resolution: "hypothesis" as const,
      optional: true,
      status: "planned" as const,
      triggerRadiusM: 500,
    },
    {
      id: "usj",
      label: "Universal Studios Japan",
      kind: "poi" as const,
      lat: 34.6654,
      lng: 135.4323,
      zoneId: "zone-japan",
      resolution: "hypothesis" as const,
      optional: true,
      status: "planned" as const,
      triggerRadiusM: 1200,
    },
  ] as const;

  const executionZones = [
    { id: "zone-korea", label: "Korea", countryCode: "KR" },
    { id: "zone-airport", label: "Airport", regionHint: "Transit hub" },
    { id: "zone-japan", label: "Japan", countryCode: "JP" },
    {
      id: "zone-osaka-downtown",
      label: "Osaka Downtown",
      countryCode: "JP",
      regionHint: "Osaka",
    },
  ] as const;

  const destinationSlot = composeExecutionSpaceSlot({
    slotId: "destination",
    role: "destination",
    label: "Destination",
    resolution: "confirmed",
    selectedCandidateId: "osaka",
    candidates: [
      {
        id: "osaka",
        label: "Osaka",
        lat: 34.6937,
        lng: 135.5023,
        countryCode: "JP",
      },
    ],
  });

  return composeExecutionSpace({
    origin,
    anchors,
    executionZones,
    slots: [destinationSlot],
    expectedPathAnchorIds: [
      "home-daejeon",
      "incheon-airport",
      "kansai-airport",
      "osaka-hotel-area",
      "dotonbori",
      "usj",
      "osaka-hotel-area",
      "kansai-airport",
      "home-daejeon",
    ],
    edges: [
      { fromAnchorId: "home-daejeon", toAnchorId: "incheon-airport", mode: "transit" },
      { fromAnchorId: "incheon-airport", toAnchorId: "kansai-airport", mode: "flight" },
      { fromAnchorId: "kansai-airport", toAnchorId: "osaka-hotel-area", mode: "transit" },
      { fromAnchorId: "osaka-hotel-area", toAnchorId: "dotonbori", mode: "walk" },
      { fromAnchorId: "dotonbori", toAnchorId: "usj", mode: "transit" },
      { fromAnchorId: "usj", toAnchorId: "osaka-hotel-area", mode: "transit" },
      { fromAnchorId: "osaka-hotel-area", toAnchorId: "kansai-airport", mode: "transit" },
      { fromAnchorId: "kansai-airport", toAnchorId: "home-daejeon", mode: "flight" },
    ],
    status: "planning",
  });
}

/** @deprecated Use composeOsakaTravelExecutionSpace */
export const composeOsakaTravelSpatialPlan = composeOsakaTravelExecutionSpace;

export type { ExecutionSpace as SpatialPlan };
