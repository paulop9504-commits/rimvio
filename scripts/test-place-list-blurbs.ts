/**
 * Place list blurb seeds (facts path) — no live LLM.
 * Run: npx tsx scripts/test-place-list-blurbs.ts
 */
import assert from "node:assert/strict";
import {
  buildPlaceBriefFactPack,
  buildPlaceBriefFromFacts,
} from "@/lib/context-workspace/place-brief";
import {
  isPlaceListMetaEcho,
  sanitizePlaceListBlurb,
} from "@/lib/context-workspace/place-list/sanitize-place-list-blurb";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";

const node = {
  id: "n1",
  placeId: "p1",
  kind: "lodging",
  title: "HIYORI HOTEL OSAKA NAMBA STATION",
  summaryKo: "난바역 도보 2분 · 관광 거점",
  amountLabel: "US$70",
  rating: 4.5,
  reviewCount: 120,
  tags: ["stay", "reservable"],
  visible: true,
  selected: false,
  bookmarked: false,
  lat: 34.66,
  lng: 135.5,
  source: "scout",
  actionReadyState: "idle",
} as unknown as ContextWorkspaceNode;

const pack = buildPlaceBriefFactPack({ node, destinationKo: "오사카" });
assert.equal(pack.placeId, "p1");
assert.ok(pack.title.includes("HIYORI"));
const brief = buildPlaceBriefFromFacts(pack);
assert.ok(
  (brief.introKo && brief.introKo.length > 0) ||
    (pack.summaryKo && pack.summaryKo.length > 0),
  "facts seed for list card",
);

{
  assert.equal(isPlaceListMetaEcho("★ 9.4 · 호텔 · 10,294,271원"), true);
  assert.equal(sanitizePlaceListBlurb("★ 9.4 · 호텔 · 10,294,271원"), null);
  assert.equal(
    sanitizePlaceListBlurb("난바역 도보 2분 · 관광 거점"),
    "난바역 도보 2분 관광 거점",
  );
  assert.ok(
    sanitizePlaceListBlurb(
      "고급 호텔을 원할 때 좋지만, 가격은 다소 높은 편이에요.",
    )?.includes("고급"),
  );
}

console.log("place-list-blurbs facts seed + meta sanitize: ok");
