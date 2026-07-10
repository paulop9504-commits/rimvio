import assert from "node:assert/strict";

import { loadEnvLocal } from "../lib/test/load-env-local";
import { isLiteApiConfigured, searchLiteApiLodgingNearby } from "../lib/globe/context-hub/providers/liteapi";

loadEnvLocal();

async function main(): Promise<void> {
  if (!isLiteApiConfigured()) {
    console.log("test-liteapi-lodging-search: skip (LITEAPI_API_KEY not set)");
    return;
  }

  const rows = await searchLiteApiLodgingNearby({
    lat: 34.6937,
    lng: 135.5023,
    maxResults: 5,
    checkInIso: "2026-08-01",
    checkOutIso: "2026-08-03",
    guestCount: 2,
  });

  assert.ok(rows.length > 0, "expected liteapi lodging rows");
  assert.ok(rows[0]?.provider === "liteapi");
  assert.ok(rows[0]?.placeId.startsWith("liteapi:"));
  assert.ok((rows[0]?.roomOffers?.length ?? 0) > 0, "expected real room offers");
  assert.ok(rows[0]?.roomOffers?.[0]?.providerOfferId, "expected offerId on room");
  const imageCount = rows[0]?.images.length ?? 0;
  assert.ok(imageCount >= 1, "expected at least one hotel image");
  const roomWithPhotos = rows
    .flatMap((row) => row.roomOffers ?? [])
    .find((offer) => (offer.imageUrls?.length ?? 0) > 0);
  if (roomWithPhotos) {
    console.log(
      `  room photo: ${roomWithPhotos.title} · ${roomWithPhotos.imageUrls?.length} imgs`,
    );
  }

  console.log(`test-liteapi-lodging-search: ok (${rows.length} hotels)`);
  console.log(
    `  sample: ${rows[0]?.name} · ${rows[0]?.roomOffers?.[0]?.title} · ${imageCount} photos`,
  );
}

void main();
