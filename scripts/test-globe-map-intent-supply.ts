import assert from "node:assert/strict";
import { resolveGlobeMapIntent } from "../lib/globe/intent-supply/resolve-globe-map-intent";

assert.equal(resolveGlobeMapIntent("나 숙소 구해야해").kind, "lodging_supply");
assert.equal(resolveGlobeMapIntent("홍대 맛집 추천").kind, "place_food_supply");
assert.equal(resolveGlobeMapIntent("정성이랑 어디 다녀왔어").kind, "people_recall");
assert.equal(resolveGlobeMapIntent("@중고 맥북").kind, "market_compose");

console.log("test-globe-map-intent-supply: ok");
