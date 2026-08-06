#!/usr/bin/env npx tsx
/**
 * Place locate — 「X 어디야」→ Anchor Projection contract.
 */
import assert from "node:assert/strict";
import {
  extractPlaceLocateQuery,
  isPlaceLocateUtterance,
  resolvePlaceLocateSync,
  tryApplyPlaceLocateFromUtterance,
  tryApplyPlaceLocateFromUtteranceSync,
  USJ_GEO_ID,
} from "../lib/context-workspace/reality-anchor";
import {
  clearContextWorkspace,
  readContextWorkspace,
} from "../lib/context-workspace/workspace-store";

assert.equal(isPlaceLocateUtterance("오사카 어디야"), true);
assert.equal(isPlaceLocateUtterance("USJ 어디에 있어"), true);
assert.equal(isPlaceLocateUtterance("도쿄타워 위치"), true);
assert.equal(isPlaceLocateUtterance("도쿄 무슨 현이야"), true);
assert.equal(isPlaceLocateUtterance("편의점 어디야"), false);
assert.equal(isPlaceLocateUtterance("호텔 어디야"), false);
assert.equal(isPlaceLocateUtterance("근처 숙소 찾아줘"), false);

assert.equal(extractPlaceLocateQuery("오사카 어디야"), "오사카");
assert.match(
  extractPlaceLocateQuery("유니버셜 스튜디오 어디에 있어"),
  /유니버셜|스튜디오/,
);

const osaka = resolvePlaceLocateSync("오사카 어디야");
assert.ok(osaka);
assert.ok(osaka!.lat > 34 && osaka!.lat < 35);
assert.match(osaka!.labelKo, /오사카|大阪/);
assert.ok(osaka!.hierarchyKo.includes("→") || osaka!.hierarchyKo.length > 2);

const usj = resolvePlaceLocateSync("유니버셜 스튜디오 어디야");
assert.ok(usj);
assert.equal(usj!.geoId, USJ_GEO_ID);

const tower = resolvePlaceLocateSync("도쿄타워 위치");
assert.ok(tower);
assert.ok(tower!.kind === "poi");

async function main() {
const CTX = "ctx_place_locate_test";
clearContextWorkspace(CTX);
const applied = tryApplyPlaceLocateFromUtteranceSync({
  utterance: "오사카 어디야",
  contextEventId: CTX,
});
assert.ok(applied);
assert.equal(applied!.handled, true);
assert.match(applied!.statusKo, /오사카|지도|일본/);
const state = readContextWorkspace(CTX);
assert.ok(state);
assert.ok(state!.nodes.some((n) => n.selected));
assert.ok(
  state!.nodes.some((n) => Number.isFinite(n.lat) && Number.isFinite(n.lng)),
);
assert.ok(
  state!.nodes.some(
    (n) =>
      n.tags.includes("place_locate") || n.tags.includes("address_locate"),
  ),
  "locate pins must be map-only (no Object Place panel)",
);

const agent = await tryApplyPlaceLocateFromUtterance({
  utterance: "USJ 어디야",
  contextEventId: null,
});
assert.ok(agent);
assert.equal(agent!.handled, true);
assert.ok(agent!.workspaceMutated || agent!.openedWorkspace);
assert.match(agent!.statusKo, /유니버설|스튜디오|지도|일본|오사카/i);

assert.equal(
  await tryApplyPlaceLocateFromUtterance({
    utterance: "오사카 호텔 어디야",
    contextEventId: CTX,
  }),
  null,
);

// Unknown object: sync must NOT fail-closed (blocks Nominatim / Wikipedia).
assert.equal(
  tryApplyPlaceLocateFromUtteranceSync({
    utterance: "츠텐카쿠 어디에 있어",
    contextEventId: CTX,
  }),
  null,
);

const unknown = await tryApplyPlaceLocateFromUtterance({
  utterance: "츠텐카쿠 어디에 있어",
  contextEventId: null,
});
assert.ok(unknown);
assert.equal(unknown!.handled, true);
assert.ok(unknown!.workspaceMutated || unknown!.openedWorkspace);
assert.ok(!/못 찾았어요/u.test(unknown!.statusKo));
assert.match(unknown!.statusKo, /쓰텐|츠텐|通天|지도|오사카|大阪/i);

const { applyGlobeWorkspaceAgentTurn } = await import(
  "../lib/context-run/apply-globe-workspace-agent-turn"
);
const globe = await applyGlobeWorkspaceAgentTurn({
  utterance: "오사카 어디야",
});
assert.equal(globe.handled, true);
assert.equal(globe.patchKind, "place_locate");
assert.ok(globe.statusKo);

console.log("place-locate: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
