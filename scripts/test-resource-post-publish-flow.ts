import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveResourceStatus } from "../lib/resource/resolve-resource-status";
import type { MarketIntentRecord } from "../lib/globe/market/market-intent-types";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

const fixture: MarketIntentRecord = {
  id: "intent-a",
  userId: "user-1",
  eventId: "evt-a",
  role: "listing",
  categoryId: "market.phone",
  title: "아이폰 13",
  priceMinKrw: 400_000,
  priceMaxKrw: 400_000,
  radiusKm: 5,
  anchorLat: 37.5,
  anchorLng: 127.0,
  placeLabel: "강남",
  peakHour: null,
  confirmedAtIso: new Date().toISOString(),
  active: true,
  detail: {
    productName: "아이폰 13",
    publishedExternal: true,
  },
};

const status = resolveResourceStatus({
  record: fixture,
  tradeSessions: [],
});

assert.equal(status.eventId, "evt-a");
assert.equal(status.visibility.innerGlobe, true);
assert.equal(status.visibility.outerGlobe, true);
assert.ok(status.aiActivity.views >= 0);

const chatTypes = read("lib/globe/chat/globe-chat-session-types.ts");
assert.ok(chatTypes.includes("resource_complete"), "chat resource_complete kind");

const chatScreen = read("components/globe/chat/globe-chat-screen.tsx");
assert.ok(chatScreen.includes("GlobeChatCompletionCard"), "chat completion card wired");

const fieldCard = read("components/field/field-resource-status-card.tsx");
assert.ok(fieldCard.includes("resolveResourceStatus"), "field status card");

const home = read("components/globe/globe-home-client.tsx");
assert.ok(home.includes("syncResourceCompleteToChat"), "publish syncs completion");
assert.ok(home.includes("onViewInnerGlobe"), "inner globe navigation");

console.log("test-resource-post-publish-flow: ok");
