#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { attachPlaceThumbnails } from "@/lib/places/fetch-place-thumbnails";
import { attachPlaceThumbnailsForDomain } from "@/lib/places/fetch-attraction-photo-urls";
import {
  isMockOrSeedPlaceId,
  isTrustedVenueMediaUrl,
  keepProviderPlacePhotos,
  sanitizePlaceInventoryRow,
} from "@/lib/globe/venue-media-fidelity";
import type { PlaceCandidate } from "@/lib/context-resolver/places/types";

async function run() {
  assert.equal(
    isTrustedVenueMediaUrl(
      "https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=abc",
    ),
    true,
  );
  assert.equal(
    isTrustedVenueMediaUrl("https://images.unsplash.com/photo-fake"),
    false,
  );
  assert.equal(
    isTrustedVenueMediaUrl("https://shop.pstatic.net/image/food.jpg"),
    false,
  );
  assert.equal(
    isTrustedVenueMediaUrl("https://encrypted-tbn0.gstatic.com/images?q=tbn:A"),
    false,
  );
  assert.ok(isMockOrSeedPlaceId("mock-park"));
  assert.ok(isMockOrSeedPlaceId("seed:pharmacy:1"));

  const pharmacy = sanitizePlaceInventoryRow({
    placeId: "mock-pharmacy",
    name: "근처 약국",
    lat: 36.35,
    lng: 127.38,
    images: [
      "https://images.unsplash.com/photo-fake",
      "https://shop.pstatic.net/scrape.jpg",
    ],
    provider: "mock",
  });
  assert.deepEqual(pharmacy.images, []);

  const liveAmenity = sanitizePlaceInventoryRow({
    placeId: "ChIJabc",
    name: "둔산 편의점",
    lat: 36.35,
    lng: 127.38,
    images: [
      "https://images.unsplash.com/photo-fake",
      "https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=x",
    ],
    provider: "google_places",
  });
  assert.deepEqual(liveAmenity.images, [
    "https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=x",
  ]);

  const candidate: PlaceCandidate = {
    place_id: "mock-convenience",
    name: "근처 편의점",
    address: "도보 3분",
    lat: 36.35,
    lng: 127.38,
    rating: 4,
    open_now: true,
    vibes: ["unknown"],
    phone: null,
    maps_url: null,
    thumbnail_url: "https://shop.pstatic.net/scrape.jpg",
    photo_urls: ["https://images.unsplash.com/photo-fake"],
  };

  const [kept] = await attachPlaceThumbnailsForDomain([candidate], {
    anchor: "둔산동",
    domain: "amenity",
  });
  assert.equal(kept?.thumbnail_url, null);
  assert.deepEqual(kept?.photo_urls, []);

  const [eateryKept] = await attachPlaceThumbnails(
    [
      {
        ...candidate,
        place_id: "ChIJeatery",
        thumbnail_url:
          "https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=food",
        photo_urls: [
          "https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=food",
        ],
      },
    ],
    { anchor: "둔산동", cuisine: "한식" },
  );
  assert.ok(eateryKept?.thumbnail_url?.includes("maps.googleapis.com"));

  assert.deepEqual(
    keepProviderPlacePhotos({
      placeId: "mock-atm",
      thumbnailUrl: "https://shop.pstatic.net/x.jpg",
      photoUrls: ["https://images.unsplash.com/y.jpg"],
    }),
    { thumbnail_url: null, photo_urls: [] },
  );

  console.log("test-venue-media-fidelity: ok");
}

void run();
