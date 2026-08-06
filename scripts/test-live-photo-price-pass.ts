/**
 * Live photo/price pass-through: hit fields survive materialize → Workspace node.
 */
import assert from "node:assert/strict";
import { amountLabelFromPriceLevel } from "../lib/search-engine/amount-label-from-price-level";
import { mapRestaurantCandidatesToPlaceHits } from "../lib/search-engine/map-restaurant-candidates-to-hits";
import {
  clearContextWorkspace,
  clearWorkspaceChat,
  compileTripEntitySlots,
  materializeTripDraftStops,
  prepareTripWorkspaceDraft,
  resolveTripDayCount,
} from "../lib/context-workspace";
import type { PlaceSearchHit } from "../lib/search-engine/run-place-search";
import type { TripSlotInventory } from "../lib/context-workspace/reality-draft/compile-trip-entity-slots";

assert.equal(amountLabelFromPriceLevel(2), "₩₩");
assert.equal(amountLabelFromPriceLevel(null), null);

const restHits = mapRestaurantCandidatesToPlaceHits({
  candidates: [
    {
      placeId: "ChIJtest",
      name: "테스트 라멘",
      lat: 35.66,
      lng: 139.7,
      rating: 4.5,
      reviewCount: 120,
      priceLevel: 2,
      openNow: true,
      images: ["https://example.com/ramen.jpg"],
      specialReasonKo: null,
      source: "google",
      distanceM: 200,
    } as never,
  ],
  query: "시부야 맛집",
  anchorLat: 35.66,
  anchorLng: 139.7,
});
assert.equal(restHits[0]?.thumbnailUrl, "https://example.com/ramen.jpg");
assert.equal(restHits[0]?.amountLabel, "₩₩");

const CTX = "test:live-photo-price";
clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);

const utterance = "도쿄 4박5일";
const dayCount = resolveTripDayCount({ nights: 4, days: 5 });
const slots = compileTripEntitySlots({
  destinationKo: "도쿄",
  stayLabelKo: "4박5일",
  days: 5,
  nights: 4,
});

const liveHit: PlaceSearchHit = {
  id: "maps:live-hotel-1",
  labelKo: "라이브 호텔 시부야",
  domain: "lodging",
  lat: 35.6595,
  lng: 139.7004,
  rating: 4.4,
  walkMinutes: 8,
  reservable: true,
  localFavorite: false,
  priceBand: 2,
  source: "liteapi",
  amountLabel: "128,000원",
  thumbnailUrl: "https://example.com/hotel.jpg",
  images: ["https://example.com/hotel.jpg", "https://example.com/hotel2.jpg"],
  liteapiOfferId: "offer-1",
  reviewCount: 88,
};

const inventories: TripSlotInventory[] = slots.map((slot, i) => {
  if (slot.dayPart === "stay" || slot.entityKind === "lodging") {
    return { slotId: slot.slotId, hits: [liveHit], picked: liveHit };
  }
  return { slotId: slot.slotId, hits: [], picked: null };
});

const { stops } = materializeTripDraftStops({
  destinationKo: "도쿄",
  utterance,
  slots,
  dayCount,
  inventories,
});
const lodging = stops.find((s) => s.id === liveHit.id);
assert.ok(lodging);
assert.equal(lodging!.thumbnailUrl, "https://example.com/hotel.jpg");
assert.equal(lodging!.amountLabel, "128,000원");
assert.equal(lodging!.galleryUrls?.[0], "https://example.com/hotel.jpg");

const drafted = prepareTripWorkspaceDraft({
  utterance: "오사카 4박5일",
  contextEventId: CTX,
  tripPrep: {
    destinationKo: "오사카",
    nights: 4,
    days: 5,
    checkInIso: null,
    checkOutIso: null,
  },
  expand: false,
  skipUserChat: true,
});
assert.ok(drafted);
const priced = drafted!.nodes.filter((n) => n.amountLabel);
assert.ok(
  priced.length >= 1,
  `expected catalog/guide prices on Osaka nodes, got ${priced.length}`,
);
const apa = drafted!.nodes.find((n) => /APA/i.test(n.title));
assert.ok(apa?.amountLabel, "APA should carry amountLabel");

console.log(
  "ok live-photo-price-pass",
  `osakaPriced=${priced.length}`,
  `apa=${apa?.amountLabel}`,
  `liveThumb=${lodging!.thumbnailUrl}`,
);

clearWorkspaceChat(CTX);
clearContextWorkspace(CTX);
