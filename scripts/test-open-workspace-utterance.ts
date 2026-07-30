/**
 * Open Workspace utterance + Osaka eatery catalog keep.
 * Run: npx tsx scripts/test-open-workspace-utterance.ts
 */

import assert from "node:assert/strict";
import { gateOperatorTurnSync } from "@/lib/globe/operator-turn/gate-operator-turn";
import type { OperatorTurnSsot } from "@/lib/globe/operator-turn/types";
import {
  isOpenWorkspaceUtterance,
  openMapContextWorkspace,
  readContextWorkspace,
  tryOpenWorkspaceFromUtterance,
} from "@/lib/context-workspace";
import { resolveCommandFirstDecision } from "@/lib/rimvio-command/command-first";
import { searchOsakaDemoCatalog } from "@/lib/search-engine/osaka-demo-catalog";
import { runPlaceSearchAsync } from "@/lib/search-engine/run-place-search-async";

async function main(): Promise<void> {
  assert.equal(isOpenWorkspaceUtterance("작업장 띄워"), true);
  assert.equal(isOpenWorkspaceUtterance("작업장 열어줘"), true);
  assert.equal(isOpenWorkspaceUtterance("맛집 찾아"), false);
  assert.equal(isOpenWorkspaceUtterance("호텔 찾아"), false);

  const emptySsot: OperatorTurnSsot = {
    contextEventId: "ctx-open-ws",
    scoutContract: null,
    selectedAnchor: null,
    lensSession: null,
    lastBatch: null,
    reelKinds: [],
    reelItemCount: 0,
    composeTail: [],
    hasActiveSpec: false,
    explorationMode: "convergent",
  };

  const plan = gateOperatorTurnSync({
    text: "작업장 띄워",
    ssot: emptySsot,
  });
  assert.equal(plan.tool, "open_workspace");

  const cmd = resolveCommandFirstDecision({
    utterance: "작업장 띄워",
    activeContextId: "ctx-open-ws",
    activeWorkspaceKind: "travel",
  });
  assert.equal(cmd.commandId, "open_workspace");
  assert.equal(cmd.action, "execute");

  openMapContextWorkspace({
    contextEventId: "ctx-open-ws",
    domain: "lodging",
    query: "오사카 숙소",
    summaryKo: "오사카 여행 작업장",
    hits: [
      {
        id: "maps:hotel-1",
        labelKo: "테스트 호텔",
        domain: "lodging",
        lat: 34.66,
        lng: 135.5,
        rating: 4.2,
        walkMinutes: 5,
        reservable: true,
        localFavorite: false,
        priceBand: 2,
        source: "maps",
      },
    ],
    source: "nl_open",
  });
  assert.ok(readContextWorkspace("ctx-open-ws"));

  const opened = tryOpenWorkspaceFromUtterance({
    contextEventId: "ctx-open-ws",
    utterance: "작업장 띄워",
  });
  assert.ok(opened?.ok);
  assert.ok(opened!.replyKo.includes("작업장"));

  const catalog = searchOsakaDemoCatalog({
    query: "맛집 찾아",
    domain: "eatery",
    anchorLat: 34.668,
    anchorLng: 135.501,
    limit: 4,
  });
  assert.ok(catalog && catalog.length >= 2, "Osaka eatery catalog");

  const hits = await runPlaceSearchAsync({
    query: "맛집 찾아",
    domain: "eatery",
    anchorLat: 34.668,
    anchorLng: 135.501,
    contextLabelKo: "오사카",
    limit: 4,
    allowSeedFallback: false,
  });
  assert.ok(
    hits.length >= 1,
    `expected Osaka eatery hits when live empty, got ${hits.length}`,
  );
  assert.ok(
    hits.every((h) => !h.id.startsWith("search:")),
    "no invented orbit seeds",
  );

  const poiHits = await runPlaceSearchAsync({
    query: "놀거리 찾아",
    domain: "poi",
    anchorLat: 34.668,
    anchorLng: 135.501,
    contextLabelKo: "오사카",
    limit: 4,
    allowSeedFallback: false,
  });
  assert.ok(
    poiHits.length >= 1,
    `expected Osaka poi/놀거리 hits when live empty, got ${poiHits.length}`,
  );
  assert.ok(poiHits.some((h) => h.id.startsWith("poi:osaka:")));

  console.log("OK — open-workspace-utterance");
}

void main();
