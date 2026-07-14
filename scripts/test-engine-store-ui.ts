import assert from "node:assert/strict";
import {
  buildContextEngineStoreRows,
  buildContextEngineStoreOfferRows,
  filterContextEngineStoreOffers,
} from "../lib/globe/context-hub/build-context-engine-store-rows";
import { installEngineManifestOnContextMetadata } from "../lib/engine/install-context-engine";
import { FIXTURE_ACME_LODGING_ENGINE_MANIFEST } from "../lib/marketplace/marketplace-test-fixtures";
import { listPublishedEngineManifests } from "../lib/marketplace/engine-market-registry";
import type { EventCandidate } from "../lib/events/event-candidate";

const travelEvent = {
  id: "ctx-store",
  title: "오사카",
  category: "travel",
  source: "user",
  lifecycle: "active",
  datetime: "2026-07-16T00:00:00.000Z",
  confidence: 1,
  lifecycleUpdatedAt: "2026-07-01T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {},
} as unknown as EventCandidate;

const defaultRows = buildContextEngineStoreRows({ event: travelEvent });
assert.ok(defaultRows.installed.length >= 5);
assert.equal(defaultRows.offers.length, 1);
assert.equal(defaultRows.offers[0]?.manifestId, FIXTURE_ACME_LODGING_ENGINE_MANIFEST.manifestId);
assert.equal(defaultRows.offers[0]?.provider.providerKind, "organization");
assert.equal(defaultRows.offers[0]?.provider.providerMemberId, "acme_hotels");

const partnerOnly = filterContextEngineStoreOffers(defaultRows.offers, { partnerOnly: true });
assert.equal(partnerOnly.length, 1);
assert.equal(
  filterContextEngineStoreOffers(defaultRows.offers, { providerKind: "ai_agent" }).length,
  0,
);

const financeEvent = {
  ...travelEvent,
  id: "ctx-finance",
  category: "finance",
} as EventCandidate;

const financeRows = buildContextEngineStoreRows({ event: financeEvent });
assert.ok(financeRows.offers.every((row) => row.engineId !== "lodging_search"));

const flightOnly = installEngineManifestOnContextMetadata({
  metadata: {
    contextInstalledEnginesV1: {
      version: 1,
      engines: [
        {
          engineId: "flight_booking",
          manifestId: "eng-flight-booking-rimvio-1",
          version: "1.0.0",
          providerId: "rimvio_travel",
          installedAtIso: "2026-07-01T00:00:00.000Z",
          source: "dev",
        },
      ],
    },
  },
  manifest: listPublishedEngineManifests("flight_booking")[0]!,
  event: travelEvent,
});
assert.equal(flightOnly.ok, true);

const restrictedEvent = {
  ...travelEvent,
  metadata: flightOnly.ok ? flightOnly.metadata : {},
} as EventCandidate;

const restrictedRows = buildContextEngineStoreRows({ event: restrictedEvent });
assert.equal(restrictedRows.installed.length, 1);
assert.equal(restrictedRows.installed[0]?.engineId, "flight_booking");
assert.equal(restrictedRows.installed[0]?.provider?.providerMemberId, "rimvio");
assert.equal(restrictedRows.installed[0]?.provider?.providerKind, "ai_agent");
assert.ok(restrictedRows.offers.some((row) => row.engineId === "lodging_search"));

const acmeLodgingOffer = restrictedRows.offers.find(
  (row) => row.manifestId === FIXTURE_ACME_LODGING_ENGINE_MANIFEST.manifestId,
);
const rimvioLodgingOffer = restrictedRows.offers.find(
  (row) => row.manifestId === "eng-lodging-search-rimvio-1",
);
assert.ok(acmeLodgingOffer);
assert.ok(rimvioLodgingOffer);
assert.equal(acmeLodgingOffer.provider.providerMemberLabelKo, "ACME 호텔");
assert.equal(acmeLodgingOffer.provider.providerKindLabelKo, "파트너");

const partnerOffers = filterContextEngineStoreOffers(restrictedRows.offers, {
  partnerOnly: true,
});
assert.equal(partnerOffers.length, 1);
assert.equal(partnerOffers[0]?.manifestId, FIXTURE_ACME_LODGING_ENGINE_MANIFEST.manifestId);

const lodgingInstalled = installEngineManifestOnContextMetadata({
  metadata: restrictedEvent.metadata,
  manifest: listPublishedEngineManifests("lodging_search").find(
    (row) => row.manifestId === "eng-lodging-search-rimvio-1",
  )!,
  event: travelEvent,
});
assert.equal(lodgingInstalled.ok, true);

const withRimvioLodging = {
  ...restrictedEvent,
  metadata: lodgingInstalled.ok ? lodgingInstalled.metadata : {},
} as EventCandidate;

const afterRimvioLodging = buildContextEngineStoreOfferRows({ event: withRimvioLodging });
const lodgingOffersAfterRimvio = afterRimvioLodging.filter(
  (row) => row.engineId === "lodging_search",
);
assert.equal(lodgingOffersAfterRimvio.length, 1);
assert.equal(lodgingOffersAfterRimvio[0]?.manifestId, FIXTURE_ACME_LODGING_ENGINE_MANIFEST.manifestId);

const partnerSwitch = installEngineManifestOnContextMetadata({
  metadata: withRimvioLodging.metadata,
  manifest: FIXTURE_ACME_LODGING_ENGINE_MANIFEST,
  event: travelEvent,
  source: "marketplace",
});
assert.equal(partnerSwitch.ok, true);
if (partnerSwitch.ok) {
  assert.equal(partnerSwitch.alreadyInstalled, false);
  assert.equal(partnerSwitch.record.manifestId, FIXTURE_ACME_LODGING_ENGINE_MANIFEST.manifestId);
  assert.equal(partnerSwitch.record.providerId, "acme_lodging_api");
}

const afterPartnerSwitch = buildContextEngineStoreRows({
  event: {
    ...withRimvioLodging,
    metadata: partnerSwitch.ok ? partnerSwitch.metadata : {},
  },
});
assert.equal(afterPartnerSwitch.installed.length, 2);
const installedLodging = afterPartnerSwitch.installed.find(
  (row) => row.engineId === "lodging_search",
);
assert.ok(installedLodging);
assert.equal(installedLodging.provider?.providerMemberId, "acme_hotels");
assert.equal(installedLodging.provider?.providerKind, "organization");
assert.ok(
  afterPartnerSwitch.offers.some(
    (row) => row.manifestId === "eng-lodging-search-rimvio-1",
  ),
);

console.log("test-engine-store-ui: ok");
