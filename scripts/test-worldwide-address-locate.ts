#!/usr/bin/env npx tsx
/**
 * Worldwide street address locate — KR · JP · CN · US same multi-candidate UX.
 */
import assert from "node:assert/strict";
import {
  inferAddressCountryCodes,
  isKoreanAddressQuery,
  isStreetAddressQuery,
} from "@/lib/location-engine/street-address-query";
import { resolveAddressLocateCandidates } from "@/lib/location-engine/resolve-address-candidates";
import {
  isPlaceLocateUtterance,
  tryApplyPlaceLocateFromUtterance,
} from "@/lib/context-workspace/reality-anchor/place-locate";
import { clearContextWorkspace } from "@/lib/context-workspace/workspace-store";
import { clearPoiGeometryOverlayForTests } from "@/lib/reality-provider/poi-geometry-store";

assert.equal(isKoreanAddressQuery("계산동 722"), true);
assert.equal(isStreetAddressQuery("계산동 722"), true);
assert.equal(isStreetAddressQuery("大阪市浪速区恵美須東1丁目"), true);
assert.equal(isStreetAddressQuery("350 5th Avenue New York"), true);
assert.equal(isStreetAddressQuery("北京市东城区东长安街1号"), true);
assert.equal(isStreetAddressQuery("오사카"), false);
assert.equal(isPlaceLocateUtterance("350 5th Avenue New York"), true);
assert.equal(isPlaceLocateUtterance("大阪市浪速区恵美須東1丁目 어디야"), true);

assert.equal(inferAddressCountryCodes("계산동 722"), "kr");
assert.equal(inferAddressCountryCodes("大阪市浪速区恵美須東1丁目"), "jp");
assert.equal(inferAddressCountryCodes("350 5th Avenue New York"), "us");

async function main() {
  const kr = await resolveAddressLocateCandidates({ query: "계산동 722" });
  assert.ok(kr.length >= 1);

  const us = await resolveAddressLocateCandidates({
    query: "350 5th Avenue New York",
  });
  assert.ok(us.length >= 1, "Empire State / 5th Ave should resolve");
  assert.ok(
    us.some((c) => /New York|NY|United States|Empire/i.test(c.addressKo + c.subtitleKo)),
  );

  const jp = await resolveAddressLocateCandidates({
    query: "大阪市浪速区恵美須東1丁目",
  });
  assert.ok(jp.length >= 1, "Osaka Ebisuhigashi should resolve");

  clearPoiGeometryOverlayForTests();
  const CTX = "ctx_world_address_locate";
  clearContextWorkspace(CTX);
  const applied = await tryApplyPlaceLocateFromUtterance({
    utterance: "350 5th Avenue New York",
    contextEventId: CTX,
  });
  assert.ok(applied?.handled);
  assert.ok(applied!.workspaceMutated || (applied!.objects?.length ?? 0) > 0);
  clearContextWorkspace(CTX);

  console.log("ok — worldwide street address locate");
}

void main();
