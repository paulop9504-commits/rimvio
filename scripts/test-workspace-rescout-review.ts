/**
 * Workspace rescout — expand for review + never cheer 0-candidate wipe.
 * Run: npx tsx scripts/test-workspace-rescout-review.ts
 */

import assert from "node:assert/strict";
import {
  openMapContextWorkspace,
  readContextWorkspace,
  tryApplyWorkspacePromptTurn,
} from "@/lib/context-workspace";
import { resolveWorkspaceSearchDomain } from "@/lib/context-workspace/resolve-workspace-search-domain";

async function main(): Promise<void> {
  assert.equal(resolveWorkspaceSearchDomain("놀거리 찾아", "lodging"), "poi");
  assert.equal(resolveWorkspaceSearchDomain("호텔 찾아", "poi"), "lodging");

  openMapContextWorkspace({
    contextEventId: "ctx-rescout-review",
    domain: "lodging",
    query: "오사카 숙소",
    summaryKo: "오사카 여행 작업장",
    hits: [
      {
        id: "maps:hotel-seed",
        labelKo: "시드 호텔",
        domain: "lodging",
        lat: 34.66,
        lng: 135.5,
        rating: 4,
        walkMinutes: 5,
        reservable: true,
        localFavorite: false,
        priceBand: 2,
        source: "maps",
      },
    ],
    source: "nl_open",
  });
  assert.ok(readContextWorkspace("ctx-rescout-review"));

  const poi = await tryApplyWorkspacePromptTurn({
    utterance: "놀거리 찾아",
    contextEventId: "ctx-rescout-review",
  });
  assert.equal(poi.handled, true);
  assert.ok(
    poi.replyKo && !/후보 0곳/u.test(poi.replyKo),
    `should not cheer 0: ${poi.replyKo}`,
  );
  if (poi.openedForReview) {
    assert.ok(/작업장에서 확인/u.test(poi.replyKo ?? ""));
    const ws = readContextWorkspace("ctx-rescout-review");
    assert.ok(ws && ws.nodes.some((n) => n.visible && n.kind === "poi"));
  } else {
    assert.ok(/못 찾았어요|말해/u.test(poi.replyKo ?? ""));
  }

  console.log("OK — workspace-rescout-review");
}

void main();
