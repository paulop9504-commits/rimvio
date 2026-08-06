/**
 * Lodging photo quality gate — Evidence ranking + soft Prepare.
 * Run: npx tsx scripts/test-lodging-photo-quality-gate.ts
 */

import assert from "node:assert/strict";
import {
  assessLodgingPhotoQuality,
  assessLodgingPhotoUrls,
  preferPhotoRichLodgingRows,
  sortLodgingRowsByPhotoQuality,
} from "@/lib/globe/lodging/lodging-photo-quality-gate";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";

function row(
  partial: Partial<ContextLodgingInventoryRow> &
    Pick<ContextLodgingInventoryRow, "placeId" | "name">,
): ContextLodgingInventoryRow {
  return {
    lat: 34.7,
    lng: 135.5,
    images: [],
    provider: "liteapi",
    photoSource: "liteapi",
    photoConfidence: "strong_identity",
    ...partial,
  };
}

function main() {
  const none = assessLodgingPhotoQuality(
    row({ placeId: "a", name: "No Photo", images: [] }),
  );
  assert.equal(none.tier, "none");
  assert.equal(none.prepareSoft, true);

  const adequate = assessLodgingPhotoUrls({
    imageUrls: ["https://cdn.example.com/a.jpg"],
  });
  assert.equal(adequate.tier, "adequate");
  assert.equal(adequate.prepareSoft, true);

  const strong = assessLodgingPhotoUrls({
    imageUrls: [
      "https://cdn.example.com/1.jpg",
      "https://cdn.example.com/2.jpg",
      "https://cdn.example.com/3.jpg",
    ],
  });
  assert.equal(strong.tier, "strong");
  assert.equal(strong.prepareSoft, false);
  assert.equal(strong.passesCardGate, true);

  const withRoom = assessLodgingPhotoUrls({
    imageUrls: ["https://cdn.example.com/h.jpg"],
    roomImageUrls: ["https://cdn.example.com/r.jpg"],
  });
  assert.equal(withRoom.tier, "strong");

  const sorted = sortLodgingRowsByPhotoQuality([
    row({ placeId: "empty", name: "E", images: [], priceKrw: 50_000 }),
    row({
      placeId: "rich",
      name: "R",
      images: [
        "https://cdn.example.com/1.jpg",
        "https://cdn.example.com/2.jpg",
        "https://cdn.example.com/3.jpg",
      ],
      priceKrw: 200_000,
    }),
  ]);
  assert.equal(sorted[0]?.placeId, "rich");

  const preferred = preferPhotoRichLodgingRows(
    [
      row({ placeId: "empty", name: "E", images: [] }),
      row({
        placeId: "one",
        name: "O",
        images: ["https://cdn.example.com/x.jpg"],
      }),
    ],
    { dropNoneWhenAlternatives: true },
  );
  assert.equal(preferred.length, 1);
  assert.equal(preferred[0]?.placeId, "one");

  const mock = assessLodgingPhotoQuality(
    row({
      placeId: "m",
      name: "Mock",
      provider: "mock",
      photoConfidence: "mock",
      images: ["https://images.unsplash.com/photo-x"],
    }),
  );
  assert.equal(mock.tier, "none");

  console.log("ok — lodging photo quality gate");
}

main();
