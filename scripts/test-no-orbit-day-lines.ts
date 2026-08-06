/**
 * 2·4: no generic orbit labels on Tokyo / Osaka trip Day lines.
 */
import assert from "node:assert/strict";
import {
  clearContextWorkspace,
  clearWorkspaceChat,
  planTripDayClusters,
  prepareTripWorkspaceDraft,
} from "../lib/context-workspace";

const GENERIC =
  /근처 카페|골목 맛집|로컬 식당|리버뷰 호텔|스테이 인|시티 로지|포토스팟|산책로|전망대/u;

function assertNoGeneric(titles: readonly string[], label: string) {
  const bad = titles.filter((t) => GENERIC.test(t));
  assert.equal(
    bad.length,
    0,
    `${label} still has placeholders: ${bad.join(", ")}`,
  );
}

const TOKYO = "test:tokyo-no-orbit";
const OSAKA = "test:osaka-no-orbit";

clearWorkspaceChat(TOKYO);
clearContextWorkspace(TOKYO);
clearWorkspaceChat(OSAKA);
clearContextWorkspace(OSAKA);

const tokyoClusters = planTripDayClusters("도쿄", 5);
assert.ok(tokyoClusters.some((c) => c.id === "asakusa"));
assert.ok(tokyoClusters.some((c) => c.id === "shibuya"));

const tokyo = prepareTripWorkspaceDraft({
  utterance: "도쿄 4박5일 일정 짜줘",
  contextEventId: TOKYO,
  tripPrep: {
    destinationKo: "도쿄",
    nights: 4,
    days: 5,
    checkInIso: null,
    checkOutIso: null,
  },
  expand: false,
  skipUserChat: true,
});
assert.ok(tokyo);
assertNoGeneric(
  tokyo!.nodes.map((n) => n.title),
  "tokyo nodes",
);
assertNoGeneric(
  (tokyo!.realityDraft?.days ?? []).map((d) => d.lineKo),
  "tokyo day lines",
);
assert.ok(
  tokyo!.nodes.some((n) => /센소지|시부야|신주쿠|우에노|긴자|APA/u.test(n.title)),
  "tokyo should include real guide names",
);

const osaka = prepareTripWorkspaceDraft({
  utterance: "오사카 4박5일 추천 일정",
  contextEventId: OSAKA,
  tripPrep: {
    destinationKo: "오사카",
    nights: 4,
    days: 5,
    checkInIso: null,
    checkOutIso: null,
  },
  expand: false,
  skipUserChat: true,
});
assert.ok(osaka);
assertNoGeneric(
  osaka!.nodes.map((n) => n.title),
  "osaka nodes",
);
assertNoGeneric(
  (osaka!.realityDraft?.days ?? []).map((d) => d.lineKo),
  "osaka day lines",
);

console.log(
  "ok no-orbit-day-lines",
  `tokyo=${tokyo!.nodes.map((n) => n.title).slice(0, 6).join(" → ")}`,
  `osakaSample=${osaka!.nodes.filter((n) => n.kind !== "amenity").slice(0, 4).map((n) => n.title).join(" → ")}`,
);

clearWorkspaceChat(TOKYO);
clearContextWorkspace(TOKYO);
clearWorkspaceChat(OSAKA);
clearContextWorkspace(OSAKA);
