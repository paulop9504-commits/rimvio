#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import { runGlobeComposerAction } from "../lib/globe/run-globe-composer-action";

const navigate = runGlobeComposerAction("@길찾기 강남역");
assert.ok(navigate);
assert.equal(navigate!.kind, "url");
assert.match(navigate!.url, /kakao|map|naver|http/iu);

const market = runGlobeComposerAction("@중고 아이폰 70만원");
assert.ok(market);
assert.equal(market!.kind, "market-compose");
assert.match(market!.composeText, /아이폰/u);

assert.equal(runGlobeComposerAction("그냥 메모"), null);

console.log("test-run-globe-composer-action: ok");
