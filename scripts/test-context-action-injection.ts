import assert from "node:assert/strict";
import { buildContextLodgingBookingHandoff } from "../lib/globe/context-action-injection/build-context-action-handoff";
import {
  resolveContextActionIntent,
  isContextActionIntentMessage,
} from "../lib/globe/context-action-injection/resolve-context-action-intent";

const bookLodging = resolveContextActionIntent({
  message: "이 호텔 예약할게",
  pinnedResourceKind: "lodging",
});
assert.equal(bookLodging?.kind, "book_lodging");
assert.equal(bookLodging?.resourceKind, "lodging");

const payLodging = resolveContextActionIntent({
  message: "숙소 결제할게",
});
assert.equal(payLodging?.kind, "pay_lodging");

const eateryOnly = resolveContextActionIntent({
  message: "맛집 예약해줘",
});
assert.equal(eateryOnly?.resourceKind, "eatery");

assert.equal(isContextActionIntentMessage("호텔 예약"), true);
assert.equal(isContextActionIntentMessage("더 가까운 곳"), false);

const handoff = buildContextLodgingBookingHandoff({
  row: {
    name: "오사카 호텔",
    lat: 34.7,
    lng: 135.5,
    mapsUrl: "https://maps.google.com/example",
    priceKrw: 120000,
    checkInIso: "2026-07-10",
    checkOutIso: "2026-07-12",
  },
  intent: {
    kind: "book_lodging",
    resourceKind: "lodging",
    confidence: 1,
  },
});
assert.match(handoff.href, /maps\.google\.com/);
assert.match(handoff.labelKo, /예약/);

console.log("test-context-action-injection: ok");
