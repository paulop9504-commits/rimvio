import assert from "node:assert/strict";
import {
  projectLodgingGlobeMarkers,
  shouldRenderLodgingGlobeMarkers,
} from "@/lib/globe/context-hub/project-lodging-globe-markers";
import { listContextHubServicesForEvent } from "@/lib/globe/context-hub/context-hub-service-catalog";
import {
  CONTEXT_LODGING_HUB_ENABLED_META_KEY,
  CONTEXT_LODGING_INVENTORY_META_KEY,
} from "@/lib/globe/context-hub/lodging-resource-types";
import { readLodgingPayloadFromResource } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { rankContextResources } from "@/lib/globe/resource/rank-context-resources";
import { resetEventCandidatesForTests } from "@/lib/events/event-store";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { composeBrainProjectionManifest } from "@/lib/situation-projection/compose-brain-projection";

function seedDaejeonTrip() {
  const stamp = "2026-08-15T08:00:00.000Z";
  return commitEventUpsert({
    id: "test-lodging-globe-markers",
    title: "대전 여행",
    category: "travel",
    source: "manual",
    lifecycle: "planned",
    datetime: "2026-08-20T09:00:00.000Z",
    place: "대전",
    description: "",
    metadata: {
      feedPlanEnabled: true,
      planWindowEndIso: "2026-08-22T11:00:00.000Z",
      planNights: 2,
      globePlaceLat: 36.3504,
      globePlaceLng: 127.3845,
      [CONTEXT_LODGING_HUB_ENABLED_META_KEY]: true,
      [CONTEXT_LODGING_INVENTORY_META_KEY]: [
        {
          placeId: "daejeon-station-stay",
          name: "대전역 스테이",
          lat: 36.3327,
          lng: 127.4341,
          images: ["https://example.com/daejeon-stay-1.jpg"],
          partnerLabel: "대전역 도보 5분",
          priceKrw: 119000,
          provider: "mock",
          photoSource: "mock",
          photoConfidence: "mock",
        },
        {
          placeId: "expo-quiet-hotel",
          name: "엑스포 조용한 호텔",
          lat: 36.3766,
          lng: 127.3885,
          images: ["https://example.com/expo-quiet-1.jpg"],
          partnerLabel: "한밭수목원 인근",
          priceKrw: 142000,
          provider: "mock",
          photoSource: "mock",
          photoConfidence: "mock",
        },
        {
          placeId: "yuseong-family-residence",
          name: "유성 패밀리 레지던스",
          lat: 36.3622,
          lng: 127.3568,
          images: ["https://example.com/yuseong-family-1.jpg"],
          partnerLabel: "가족 동행 편한 객실",
          priceKrw: 158000,
          provider: "mock",
          photoSource: "mock",
          photoConfidence: "mock",
        },
      ],
    },
    confidence: 0.9,
    lifecycleUpdatedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
  });
}

function run() {
  assert.equal(shouldRenderLodgingGlobeMarkers("space"), false);
  assert.equal(shouldRenderLodgingGlobeMarkers("city"), true);

  resetEventCandidatesForTests([]);
  const event = seedDaejeonTrip();
  const panel = listContextHubServicesForEvent(event);
  assert.ok(panel);

  const ranked = rankContextResources({
    event,
    services: panel.services,
    lat: 36.362,
    lng: 127.359,
  });
  const manifest = composeBrainProjectionManifest({
    event,
    trigger: { source: "manual", atIso: new Date().toISOString() },
  });

  const markers = projectLodgingGlobeMarkers({ event, ranked, manifest });
  assert.ok(markers.length >= 3);
  assert.equal(markers[0]?.isMain, true);
  assert.ok(markers.every((row) => row.markerKind === "lodging"));
  assert.ok(markers.every((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng)));
  const projectedMarker = markers.find((row) =>
    (row.discoveryShortLabel ?? "").includes("대전역"),
  );
  assert.ok(projectedMarker, "daejeon lodging marker is decorated on the map");
  assert.equal(projectedMarker?.ontologyBadgeLabel, "숙소");
  assert.equal(projectedMarker?.virtualCandidate, true);
  assert.match(
    projectedMarker?.discoveryPriceLabel ?? "",
    /₩|대전역 도보/u,
    "map support shows price or walk hint — never partner marketing",
  );
  assert.match(
    projectedMarker?.stayBadgeLabel ?? "",
    /8월 20일-22일 · 2박/u,
    "lodging markers expose a compact stay badge for time-aware basecamp context",
  );
  assert.match(
    projectedMarker?.relationMemoKo ?? "",
    /8월 20일-22일 · 2박/u,
    "lodging markers carry stay timing into the concise relation memo",
  );
  const firstLodging = ranked.find((entry) => entry.resource.kind === "lodging_voucher");
  assert.ok(firstLodging, "ranked resources include a lodging anchor");
  const payload = firstLodging ? readLodgingPayloadFromResource(firstLodging.resource) : null;
  assert.equal(payload?.stayWindow?.checkInIso, "2026-08-20T09:00:00.000Z");
  assert.equal(payload?.stayWindow?.checkOutIso, "2026-08-22T11:00:00.000Z");
  assert.equal(payload?.stayWindow?.nights, 2);

  const focused = projectLodgingGlobeMarkers({
    event,
    ranked,
    activeResourceId: markers[1]?.resourceId,
    manifest,
  });
  assert.equal(focused[1]?.isMain, true);
  assert.equal(focused[0]?.isMain, false);

  console.log("test-lodging-globe-markers: ok");
}

run();
