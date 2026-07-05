#!/usr/bin/env npx tsx

import assert from "node:assert/strict";
import {
  dedupeFactorChips,
  pickCardHeadline,
  pickPrimaryReason,
  stripWrappedGuideTitle,
} from "../lib/globe/brain-surface-card-copy";

const title =
  "도쿄 여행 일정 짜기 이 영상 하나로 끝! 첫 도쿄 여행 추천 코스 2박3일 3박4일 완벽 정리 (+경비,일정 파일 나눔) 🌴";

assert.equal(
  stripWrappedGuideTitle(`도쿄 맥락에 맞춰 찾은 「${title}」`, title),
  null,
);

assert.equal(
  pickPrimaryReason({
    headline: "도쿄역",
    guideTitle: title,
    whyRelevantKo: `도쿄 맥락에 맞춰 찾은 「${title}」`,
    relationReasonKo: `${title} · 설명에서 늦은 시간 단서가 보여 맛집 후보로 잡았어요`,
  }),
  "설명에서 늦은 시간 단서가 보여 맛집 후보로 잡았어요",
);

const headline = pickCardHeadline({
  nodeLabel: "도쿄역",
  guideTitle: title,
  isMediaInferredGhost: true,
});
assert.equal(headline.headline, "도쿄역");
assert.ok(headline.guideTitleLine?.includes("도쿄 여행"));

assert.deepEqual(
  dedupeFactorChips(
    [
      "도쿄 기준",
      `${title}에서 뽑음`,
      "후보 신뢰 88%",
      "늦은 시간",
      "설명에서 늦은 시간 단서가 보여 맛집 후보로 잡았어요",
    ],
    ["도쿄", "설명에서 늦은 시간 단서가 보여 맛집 후보로 잡았어요"],
    3,
  ),
  ["후보 신뢰 88%", "늦은 시간"],
);

console.log("test-brain-surface-card-copy: ok");
