#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { projectLodgingDiscoverySession } from "@/lib/globe/lodging/project-lodging-discovery-session";
import {
  resolveGoogleLodgingPhotoBundle,
  scoreGoogleLodgingIdentityMatch,
  selectPreferredLodgingImage,
} from "@/lib/globe/lodging/lodging-photo-fidelity";

function run() {
  const nearby = {
    placeId: "g-place-1",
    name: "Hotel Namba Osaka",
    lat: 34.6672,
    lng: 135.5011,
    address: "1-2-3 Namba, Osaka",
    mapsUrl: "https://maps.google.com/?cid=nearby",
    nearbyPhotoUrls: ["https://img.example/nearby.jpg"],
  };

  const exact = resolveGoogleLodgingPhotoBundle({
    nearby,
    details: {
      placeId: "g-place-1",
      name: "Hotel Namba Osaka",
      lat: 34.66723,
      lng: 135.50108,
      address: "1-2-3 Namba, Chuo Ward, Osaka",
      mapsUrl: "https://maps.google.com/?cid=detail",
      photoUrls: [
        "https://img.example/detail-1.jpg",
        "https://img.example/detail-2.jpg",
      ],
    },
  });
  assert.deepEqual(exact.images, [
    "https://img.example/detail-1.jpg",
    "https://img.example/detail-2.jpg",
    "https://img.example/nearby.jpg",
  ]);
  assert.equal(exact.photoSource, "google_places_details");
  assert.equal(exact.photoConfidence, "exact_place_id");
  assert.equal(exact.mapsUrl, "https://maps.google.com/?cid=detail");

  const mismatchIdentity = scoreGoogleLodgingIdentityMatch({
    nearby,
    details: {
      placeId: "other-place",
      name: "Hotel Namba Seoul Branch",
      lat: 37.5665,
      lng: 126.978,
      address: "Seoul",
      photoUrls: ["https://img.example/wrong-branch.jpg"],
    },
  });
  assert.equal(mismatchIdentity.exactPlaceId, false);
  assert.ok((mismatchIdentity.distanceM ?? 0) > 100_000);
  assert.ok(mismatchIdentity.score < 8);

  const fallback = resolveGoogleLodgingPhotoBundle({
    nearby,
    details: {
      placeId: "other-place",
      name: "Hotel Namba Seoul Branch",
      lat: 37.5665,
      lng: 126.978,
      address: "Seoul",
      photoUrls: ["https://img.example/wrong-branch.jpg"],
    },
  });
  assert.deepEqual(fallback.images, ["https://img.example/nearby.jpg"]);
  assert.equal(fallback.photoSource, "google_places_nearby");
  assert.equal(fallback.photoConfidence, "nearby_identity");

  assert.equal(
    selectPreferredLodgingImage({
      images: fallback.images,
      provider: "google_places",
      photoConfidence: "nearby_identity",
    }),
    "https://img.example/nearby.jpg",
  );
  assert.equal(
    selectPreferredLodgingImage({
      images: ["https://img.example/unverified.jpg"],
      provider: "google_places",
      photoConfidence: null,
    }),
    null,
  );

  const session = projectLodgingDiscoverySession({
    eventId: "evt-lodging-photo",
    scored: [
      {
        row: {
          placeId: "verified-place",
          name: "Verified Hotel",
          lat: 34.6672,
          lng: 135.5011,
          images: exact.images,
          address: exact.address,
          mapsUrl: exact.mapsUrl,
          provider: "google_places",
          photoSource: exact.photoSource,
          photoConfidence: exact.photoConfidence,
          videoUrl: null,
          priceKrw: 120_000,
          partnerLabel: "google_places",
        },
        score: 160,
        reasonKo: "가까운 숙소",
        matchReasons: ["가깝고 동선이 편해요"],
      },
      {
        row: {
          placeId: "unverified-place",
          name: "Unverified Hotel",
          lat: 34.669,
          lng: 135.503,
          images: ["https://img.example/unverified.jpg"],
          address: "Somewhere else",
          mapsUrl: "https://maps.google.com/?cid=unverified",
          provider: "google_places",
          photoSource: "google_places_details",
          photoConfidence: null,
          videoUrl: null,
          priceKrw: 140_000,
          partnerLabel: "google_places",
        },
        score: 120,
        reasonKo: "대안 숙소",
        matchReasons: ["조금 더 멀어요"],
      },
    ],
    unifiedContext: {
      personExperienceSlice: [],
      matchedPeople: [],
    } as never,
    userLat: 34.6672,
    userLng: 135.5011,
    resourceIdByPlaceId: {
      "verified-place": "evt-lodging-photo:lodging:verified-place",
      "unverified-place": "evt-lodging-photo:lodging:unverified-place",
    },
  });
  assert.ok(session);
  assert.equal(session?.items[0]?.thumbnailUrl, "https://img.example/detail-1.jpg");
  assert.equal(session?.items[1]?.thumbnailUrl, null);
  assert.equal(session?.items[0]?.title, "Verified Hotel");
  assert.equal(session?.items[0]?.addressLine, "1-2-3 Namba, Chuo Ward, Osaka");
  assert.equal(session?.items[0]?.navigationHref, "https://maps.google.com/?cid=detail");
  assert.equal(
    session?.items[1]?.navigationHref,
    "https://maps.google.com/?cid=unverified",
  );

  console.log("test-lodging-photo-fidelity: ok");
}

run();
