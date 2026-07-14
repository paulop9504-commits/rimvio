/**
 * Entity Resolver SSOT — Station / Brand / Matcha before Intent.
 */

import assert from "node:assert/strict";
import { classifyContextConditionAnchorRequest } from "../lib/globe/context-condition-ai/classify-context-condition-anchor-request";
import {
  findBrandEntity,
  findDishEntity,
  findStationEntity,
  resolveEntities,
} from "../lib/entity-resolver";

const mcdonald =
  "도쿄역 근처 맥도날드 찾어줘";
const mac = resolveEntities(mcdonald);
const station = findStationEntity(mac.entities);
const brand = findBrandEntity(mac.entities);
assert.ok(station, "station entity required");
assert.equal(station?.kind, "Station");
assert.equal(station?.geoId, "geo:jp:tokyo:tokyo-station");
assert.ok(station?.semanticPath.includes("Railway"));
assert.ok(brand, "brand entity required");
assert.equal(brand?.kind, "Brand");
assert.equal(brand?.queryFocus, "맥도날드");
assert.ok(brand?.semanticPath.includes("RestaurantChain"));
assert.ok(brand?.semanticPath.includes("Eatery"));

const macClassify = classifyContextConditionAnchorRequest(mcdonald);
assert.equal(macClassify.eateryNearby, true);
assert.equal(macClassify.lodgingSimilar, false);

const matchaNear = resolveEntities("도쿄역 근처 말차 맛집");
assert.equal(findStationEntity(matchaNear.entities)?.kind, "Station");
const dish = findDishEntity(matchaNear.entities);
assert.ok(dish);
assert.ok(
  dish?.kind === "Food" ||
    dish?.kind === "Drink" ||
    dish?.kind === "Dessert",
);
assert.equal(dish?.queryFocus, "말차");
assert.ok(
  (dish?.candidates?.length ?? 0) >= 2 || dish?.kind === "Food",
  "bare matcha should keep Drink/Dessert ambiguity or Food lead",
);

const ice = resolveEntities("말차 아이스크림");
const dessert = findDishEntity(ice.entities);
assert.equal(dessert?.kind, "Dessert");
assert.ok((dessert?.confidence ?? 0) >= 0.9);
assert.ok(!(dessert?.candidates && dessert.candidates.length > 0));

console.log("test-entity-resolver: ok");
