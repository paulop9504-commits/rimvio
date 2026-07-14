/**
 * Context installed engines — bootstrap · marketplace install · routing filter.
 */

import assert from "node:assert/strict";
import {
  detectRimvioEnginesForMessage,
  installEngineManifestOnContextMetadata,
  readContextInstalledEngineIds,
  writeInstalledEnginesWireToMetadata,
} from "../lib/engine";
import { listPublishedEngineManifests } from "../lib/marketplace/engine-market-registry";
import type { EventCandidate } from "../lib/events/event-candidate";

const travelEvent = {
  id: "ctx-travel",
  title: "오사카",
  category: "travel",
  source: "user",
  lifecycle: "active",
  datetime: "2026-07-16T00:00:00.000Z",
  place: "오사카",
  confidence: 1,
  lifecycleUpdatedAt: "2026-07-01T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  metadata: {},
} as unknown as EventCandidate;

const lodgingMsg = "부산 서면쪽 숙소 예약 준비해";

assert.deepEqual(
  detectRimvioEnginesForMessage(lodgingMsg, { event: travelEvent }).map((row) => row.id),
  ["lodging_search"],
);

const flightOnlyMetadata = writeInstalledEnginesWireToMetadata({
  metadata: {},
  wire: {
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
});

const restrictedEvent = {
  ...travelEvent,
  metadata: flightOnlyMetadata,
} as EventCandidate;

assert.deepEqual(
  detectRimvioEnginesForMessage(lodgingMsg, { event: restrictedEvent }).map((row) => row.id),
  [],
);

assert.deepEqual(readContextInstalledEngineIds({ event: travelEvent }).length, 8);
assert.deepEqual(readContextInstalledEngineIds({ event: restrictedEvent }), ["flight_booking"]);

const lodgingManifest = listPublishedEngineManifests("lodging_search")[0];
assert.ok(lodgingManifest);

const install = installEngineManifestOnContextMetadata({
  metadata: flightOnlyMetadata,
  manifest: lodgingManifest!,
  event: restrictedEvent,
});
assert.equal(install.ok, true);
if (install.ok) {
  assert.equal(install.alreadyInstalled, false);
  assert.equal(
    readContextInstalledEngineIds({
      event: { ...restrictedEvent, metadata: install.metadata },
    }).includes("lodging_search"),
    true,
  );
}

const dup = installEngineManifestOnContextMetadata({
  metadata: install.ok ? install.metadata : {},
  manifest: lodgingManifest!,
  event: restrictedEvent,
});
assert.equal(dup.ok, true);
if (dup.ok) {
  assert.equal(dup.alreadyInstalled, true);
}

assert.deepEqual(
  detectRimvioEnginesForMessage(lodgingMsg, {
    event: {
      ...restrictedEvent,
      metadata: install.ok ? install.metadata : {},
    },
  }).map((row) => row.id),
  ["lodging_search"],
);

console.log("test-context-installed-engines: ok");
