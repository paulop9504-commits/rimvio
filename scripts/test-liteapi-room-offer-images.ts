import assert from "node:assert/strict";
import { attachLiteApiRoomOfferImages } from "../lib/globe/context-hub/providers/liteapi/attach-liteapi-room-offer-images";
import {
  buildLiteApiHotelDetailsBundle,
  extractLiteApiRoomPhotoUrls,
  resolveLiteApiMappedRoomId,
} from "../lib/globe/context-hub/providers/liteapi/extract-liteapi-room-photos";
import {
  findBestRoomCatalogMatch,
  findCaptionPhotoMatches,
  scoreRoomNameMatch,
} from "../lib/globe/context-hub/providers/liteapi/match-liteapi-room-photos";
import type { LodgingRoomOffer } from "../lib/globe/context-hub/lodging-resource-types";
const offers: LodgingRoomOffer[] = [
  {
    id: "liteapi-h1-1",
    title: "Standard Room · Room Only",
    occupancyLabelKo: "성인 1명 · 객실 1개",
    priceKrw: 90_000,
    totalPriceKrw: 90_000,
    refundable: true,
    roomCount: 1,
    guestCount: 1,
    sourceLabelKo: "Nuitee Connect",
    mappedRoomId: "2617264",
  },
  {
    id: "liteapi-h1-2",
    title: "Premium Room · Breakfast",
    occupancyLabelKo: "성인 1명 · 객실 1개",
    priceKrw: 120_000,
    totalPriceKrw: 120_000,
    refundable: true,
    roomCount: 1,
    guestCount: 1,
    sourceLabelKo: "Nuitee Connect",
    mappedRoomId: "2617265",
  },
];

const roomPhotosByMappedId = new Map<string, string[]>([
  [
    "2617264",
    [
      "https://example.com/standard-1.jpg",
      "https://example.com/standard-2.jpg",
    ],
  ],
  ["2617265", ["https://example.com/premium-1.jpg"]],
]);

const attached = attachLiteApiRoomOfferImages({ offers, roomPhotosByMappedId });
assert.equal(attached[0]?.imageUrls?.[0], "https://example.com/standard-1.jpg");
assert.equal(attached[1]?.imageUrls?.[0], "https://example.com/premium-1.jpg");
assert.equal(attached[0]?.imageUrls?.length, 2);

const bundle = buildLiteApiHotelDetailsBundle({
  details: {
    hotelImages: [{ url: "https://example.com/hotel.jpg", order: 1 }],
    rooms: [
      {
        id: 2617264,
        roomName: "Standard Room",
        photos: [
          {
            url: "https://example.com/room-a.jpg",
            mainPhoto: true,
          },
          {
            hd_url: "https://example.com/room-b-hd.jpg",
            score: 10,
          },
        ],
      },
    ],
  },
});
assert.equal(bundle.hotelImages[0], "https://example.com/hotel.jpg");
assert.equal(
  bundle.roomPhotosByMappedId.get("2617264")?.[0],
  "https://example.com/room-a.jpg",
);

const urls = extractLiteApiRoomPhotoUrls([
  { url: "https://example.com/low.jpg", score: 1 },
  { hd_url: "https://example.com/hd.jpg", mainPhoto: true, score: 0 },
]);
assert.equal(urls[0], "https://example.com/hd.jpg");

assert.equal(resolveLiteApiMappedRoomId(2617264), "2617264");
assert.equal(resolveLiteApiMappedRoomId(" 2617264 "), "2617264");

assert.ok(scoreRoomNameMatch("Deluxe King", "Deluxe King Room") >= 0.5);
assert.ok(scoreRoomNameMatch("Standard Room · Room Only", "Standard Room") >= 0.85);

const fuzzyBundle = buildLiteApiHotelDetailsBundle({
  details: {
    hotelImages: [
      {
        url: "https://example.com/deluxe-caption.jpg",
        caption: "Deluxe King bedroom",
      },
      {
        url: "https://example.com/lobby.jpg",
        caption: "Hotel lobby",
      },
    ],
    rooms: [
      {
        id: 999,
        roomName: "Deluxe King Room",
        photos: [{ url: "https://example.com/deluxe-room.jpg", mainPhoto: true }],
      },
    ],
  },
});

const fuzzyOffer: LodgingRoomOffer = {
  id: "liteapi-h2-1",
  title: "Deluxe King · Room Only",
  occupancyLabelKo: "성인 2명 · 객실 1개",
  priceKrw: 150_000,
  totalPriceKrw: 150_000,
  refundable: true,
  roomCount: 1,
  guestCount: 2,
  sourceLabelKo: "Nuitee Connect",
};

const fuzzyAttached = attachLiteApiRoomOfferImages({
  offers: [{ ...fuzzyOffer, mappedRoomId: null }],
  detailsBundle: fuzzyBundle,
});
assert.equal(
  fuzzyAttached[0]?.imageUrls?.[0],
  "https://example.com/deluxe-room.jpg",
  "fuzzy room name should attach room photos",
);

const captionOnlyAttached = attachLiteApiRoomOfferImages({
  offers: [
    {
      ...fuzzyOffer,
      title: "Executive Suite · Breakfast",
      mappedRoomId: null,
    },
  ],
  detailsBundle: buildLiteApiHotelDetailsBundle({
    details: {
      hotelImages: [
        {
          url: "https://example.com/suite-caption.jpg",
          caption: "Executive Suite interior",
        },
      ],
      rooms: [],
    },
  }),
});
assert.equal(
  captionOnlyAttached[0]?.imageUrls?.[0],
  "https://example.com/suite-caption.jpg",
  "caption fuzzy match should attach gallery photo",
);

const catalogMatch = findBestRoomCatalogMatch(
  "Deluxe King · Room Only",
  fuzzyBundle.roomCatalog,
);
assert.equal(catalogMatch?.roomName, "Deluxe King Room");

const captionMatches = findCaptionPhotoMatches(
  "Deluxe King · Room Only",
  fuzzyBundle.captionPhotoIndex,
);
assert.equal(captionMatches[0], "https://example.com/deluxe-caption.jpg");
assert.equal(captionMatches.includes("https://example.com/lobby.jpg"), false);

console.log("test-liteapi-room-offer-images: ok");