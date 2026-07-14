/**
 * Entity dictionary P1–P3 + semantic paths.
 */

import assert from "node:assert/strict";
import { classifyContextConditionAnchorRequest } from "../lib/globe/context-condition-ai/classify-context-condition-anchor-request";
import {
  entitiesImplyAmenity,
  entitiesImplyEatery,
  entitiesImplyLodging,
  findAirportEntity,
  findLandmarkEntity,
  findLodgingEntity,
  resolveEntities,
} from "../lib/entity-resolver";

const uniqlo = resolveEntities("신주쿠 유니클로 찾아줘");
assert.ok(entitiesImplyAmenity(uniqlo.entities));
assert.equal(entitiesImplyEatery(uniqlo.entities), false);

const hilton = resolveEntities("도쿄 힐튼 호텔");
assert.ok(entitiesImplyLodging(hilton.entities));
assert.equal(entitiesImplyEatery(hilton.entities), false);
const hiltonClassify = classifyContextConditionAnchorRequest("도쿄 힐튼 호텔");
assert.equal(hiltonClassify.lodgingSimilar, true);
assert.equal(hiltonClassify.eateryNearby, false);

const nrt = resolveEntities("나리타 공항 근처 편의점");
assert.equal(findAirportEntity(nrt.entities)?.geoId, "geo:jp:nrt");
assert.ok(entitiesImplyAmenity(nrt.entities));

const usj = resolveEntities("유니버설 스튜디오 재팬");
assert.equal(findLandmarkEntity(usj.entities)?.geoId, "geo:jp:osaka:usj");

const doutor = resolveEntities("도토루 카페");
assert.ok(entitiesImplyEatery(doutor.entities));

const yakitori = resolveEntities("신주쿠 야키토리 맛집");
assert.ok(
  yakitori.entities.some((row) => row.queryFocus === "야키토리"),
);

const paypay = resolveEntities("PayPay로 결제");
assert.ok(
  paypay.entities.some((row) =>
    row.semanticPath.includes("Payment"),
  ),
);

const lodging = findLodgingEntity(
  resolveEntities("캡슐호텔 찾아줘").entities,
);
assert.ok(lodging);
assert.ok(lodging?.semanticPath.includes("Lodging"));

console.log("test-entity-dictionary-catalogs: ok");
