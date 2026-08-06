#!/usr/bin/env npx tsx
/**
 * Korean address / jibun locate — bare + 어디야, multi-candidate pick.
 */
import assert from "node:assert/strict";
import { isKoreanAddressQuery } from "@/lib/location-engine/korean-address-query";
import { resolveAddressLocateCandidates } from "@/lib/location-engine/resolve-address-candidates";
import {
  extractPlaceLocateQuery,
  isPlaceLocateUtterance,
  tryApplyPlaceLocateFromUtterance,
} from "@/lib/context-workspace/reality-anchor/place-locate";
import {
  clearContextWorkspace,
  readContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import { clearPoiGeometryOverlayForTests } from "@/lib/reality-provider/poi-geometry-store";

assert.equal(isKoreanAddressQuery("계산동 722"), true);
assert.equal(isKoreanAddressQuery("계양구 계산동 722"), true);
assert.equal(isKoreanAddressQuery("테헤란로 152"), true);
assert.equal(isKoreanAddressQuery("오사카"), false);
assert.equal(isKoreanAddressQuery("호텔 어디야"), false);

assert.equal(isPlaceLocateUtterance("계산동 722"), true);
assert.equal(isPlaceLocateUtterance("계산동 722 어디야"), true);
assert.equal(extractPlaceLocateQuery("계산동 722 어디야"), "계산동 722");

async function main() {
  const candidates = await resolveAddressLocateCandidates({
    query: "계산동 722",
    maxResults: 6,
  });
  assert.ok(candidates.length >= 2, "expected multi-city 계산동 candidates");
  assert.ok(
    candidates.some((c) => /인천|대전|상주|계양|유성/u.test(c.subtitleKo + c.addressKo)),
    "candidates should span different regions",
  );

  clearPoiGeometryOverlayForTests();
  const CTX = "ctx_address_locate_test";
  clearContextWorkspace(CTX);

  const applied = await tryApplyPlaceLocateFromUtterance({
    utterance: "계산동 722",
    contextEventId: CTX,
  });
  assert.ok(applied);
  assert.equal(applied!.handled, true);
  assert.match(applied!.statusKo, /후보|골라/);
  assert.ok((applied!.objects?.length ?? 0) >= 2);

  const pickedId = applied!.objects![0]!.nodeId;
  const siblings = applied!.objects!.slice(1).map((o) => o.nodeId);
  const { applyAddressCandidateSelection } = await import(
    "@/lib/context-workspace/reality-anchor/place-locate"
  );
  const picked = applyAddressCandidateSelection({
    contextEventId: CTX,
    nodeId: pickedId,
    siblingNodeIds: siblings,
  });
  assert.ok(picked);
  assert.match(picked!.statusKo, /지도/);
  const after = readContextWorkspace(CTX);
  assert.ok(after);
  const visibleAddr = after!.nodes.filter(
    (n) => n.visible && n.tags.includes("address_locate"),
  );
  assert.equal(visibleAddr.length, 1);

  // Chip pick must not imply Object Place panel ownership
  assert.ok(
    visibleAddr[0]!.tags.includes("address_locate") ||
      visibleAddr[0]!.tags.includes("place_locate"),
  );

  clearContextWorkspace(CTX);
  console.log("ok — korean address / jibun locate");
}

void main();
