import assert from "node:assert/strict";

import { buildContextLodgingBookingHandoff } from "../lib/globe/context-action-injection/build-context-action-handoff";
import { buildAirbnbLodgingSearchUrl } from "../lib/globe/context-hub/providers/airbnb";
import { resolveAirbnbIntegrationMode } from "../lib/globe/context-hub/providers/airbnb/resolve-airbnb-integration-mode";
import { resolveLodgingBookingProvider } from "../lib/globe/context-hub/resolve-lodging-booking-provider";

const osakaUrl = buildAirbnbLodgingSearchUrl({
  query: "오사카 난바",
  checkInYmd: "2026-07-15",
  checkOutYmd: "2026-07-17",
  adults: 2,
  lat: 34.6654,
  lng: 135.5023,
});

assert.ok(osakaUrl.startsWith("https://www.airbnb.com/s/homes?"));
assert.ok(osakaUrl.includes("query="));
assert.ok(osakaUrl.includes("checkin=2026-07-15"));
assert.ok(osakaUrl.includes("checkout=2026-07-17"));
assert.ok(osakaUrl.includes("adults=2"));
assert.ok(osakaUrl.includes("search_by_map=true"));

assert.equal(resolveLodgingBookingProvider({ lodgingKind: "airbnb" }), "airbnb");
assert.equal(resolveLodgingBookingProvider({ lodgingKind: "hotel" }), "google");
assert.equal(resolveLodgingBookingProvider({ lodgingKind: "any" }), "google");

const handoff = buildContextLodgingBookingHandoff({
  row: {
    name: "난바 게스트하우스",
    lat: 34.6654,
    lng: 135.5023,
    mapsUrl: "https://maps.google.com/example",
    priceKrw: 120_000,
    checkInIso: "2026-07-15T15:00:00.000Z",
    checkOutIso: "2026-07-17T11:00:00.000Z",
  },
  intent: { kind: "book_lodging", resourceKind: "lodging", confidence: 1 },
  lodgingKind: "airbnb",
});

assert.equal(handoff.actionTypeId, "field.lodging_book_airbnb");
assert.ok(handoff.href.includes("airbnb.com"));
assert.ok(!handoff.href.includes("maps.google.com"));

assert.equal(resolveAirbnbIntegrationMode(), "handoff");

console.log("test-airbnb-lodging-handoff: ok");
