#!/usr/bin/env npx tsx
/**
 * "게스트 하우스" must route as lodging — not restaurant+hotel mix.
 */
import assert from "node:assert/strict";
import { isInstantLodgingSearch } from "../lib/globe/context-condition-ai/instant-lodging-search";
import { classifyContextConditionAnchorRequest } from "../lib/globe/context-condition-ai/classify-context-condition-anchor-request";
import { resolveLocalDiscoveryAction } from "../lib/globe/context-condition-ai/resolve-local-discovery-action";
import { classifyDiscoveryEntityQuery } from "../lib/globe/feed-entity/classify-discovery-entity-query";
import { isLodgingPrepUtterance } from "../lib/globe/lodging-prep/is-lodging-prep-utterance";

assert.equal(isInstantLodgingSearch("게스트 하우스"), true);
assert.equal(isInstantLodgingSearch("게스트하우스"), true);
assert.equal(isLodgingPrepUtterance("게스트 하우스"), true);

const intent = classifyContextConditionAnchorRequest("게스트 하우스");
assert.equal(intent.lodgingSimilar, true);
assert.equal(intent.eateryNearby, false);

const entity = classifyDiscoveryEntityQuery("게스트 하우스");
assert.equal(entity.entityKind, "hotel");

const action = resolveLocalDiscoveryAction({
  message: "게스트 하우스",
});
assert.equal(action.status, "ready");
if (action.status === "ready") {
  assert.deepEqual([...action.spec.resourceTypes], ["hotel"]);
}

console.log("ok: guesthouse-lodging-classify");
