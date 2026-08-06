/**
 * Laws 14 · 15 · 19 · 25 — evidence · constraint memory · ownership · trace.
 * Run: npx tsx scripts/test-agent-constitution-runtime.ts
 */

import assert from "node:assert/strict";
import {
  appendAgentTrace,
  applyConstraintMemoryToScoutQuery,
  buildAgentActionOwnership,
  buildRecommendEvidence,
  constraintMemoryLinesKo,
  createAgentTraceEntry,
  emptyConstraintMemory,
  formatAgentTraceTimelineKo,
  gateRecommendCopy,
  mergeConstraintMemoryFromUtterance,
  ownershipSummaryKo,
} from "@/lib/agent-policy";

function main() {
  // Law 15 — budget survives location pivot
  {
    let bag = mergeConstraintMemoryFromUtterance({
      prev: null,
      utterance: "1박 10만원 이하로",
    });
    assert.ok(bag.maxNightlyPriceKrw != null);
    bag = mergeConstraintMemoryFromUtterance({
      prev: bag,
      utterance: "난바 쪽으로 해줘",
    });
    assert.equal(bag.nearLabelKo, "난바");
    assert.ok(bag.maxNightlyPriceKrw != null, "budget must survive");
    const q = applyConstraintMemoryToScoutQuery("다른 호텔 찾아줘", bag);
    assert.match(q, /난바|10만|만원/);
    assert.ok(constraintMemoryLinesKo(bag).length >= 2);
  }

  // Law 14 — evidence gate
  {
    const bare = buildRecommendEvidence({
      node: {
        title: "호텔 A",
        amountLabel: null,
        rating: null,
        tags: [],
        summaryKo: "",
      },
    });
    assert.equal(bare.ok, false);
    const gated = gateRecommendCopy({
      titleKo: "호텔 A",
      evidence: bare,
    });
    assert.equal(gated.ok, false);
    assert.match(gated.copyKo, /근거/);

    const rich = buildRecommendEvidence({
      node: {
        title: "호텔 A",
        amountLabel: "120,000원",
        rating: 4.6,
        tags: ["stay:capsule"],
        summaryKo: "",
      },
      walkMinutes: 8,
      constraints: {
        ...emptyConstraintMemory(),
        nearLabelKo: "난바",
        maxNightlyPriceKrw: 150_000,
        updatedAtIso: new Date().toISOString(),
      },
    });
    assert.equal(rich.ok, true);
    assert.ok(rich.linesKo.length >= 2);
    const ok = gateRecommendCopy({ titleKo: "호텔 A", evidence: rich });
    assert.equal(ok.ok, true);
  }

  // Law 19 — ownership
  {
    const o = buildAgentActionOwnership({
      actor: "ai",
      actionKo: "후보 교체",
      beforeKo: "우메다",
      afterKo: "난바",
    });
    assert.match(ownershipSummaryKo(o), /AI/);
    assert.match(ownershipSummaryKo(o), /우메다 → 난바/);
  }

  // Law 25 — breadcrumbs
  {
    const e1 = createAgentTraceEntry({
      kind: "search",
      summaryKo: "12곳 검색",
      ownership: buildAgentActionOwnership({ actionKo: "검색" }),
    });
    const e2 = createAgentTraceEntry({
      kind: "replace",
      summaryKo: "난바로 교체",
      ownership: buildAgentActionOwnership({ actionKo: "교체" }),
      evidenceLinesKo: ["위치 · 난바"],
    });
    const trace = appendAgentTrace(appendAgentTrace([], e1), e2);
    assert.equal(trace.length, 2);
    const lines = formatAgentTraceTimelineKo(trace);
    assert.equal(lines.length, 2);
    assert.match(lines[1]!, /난바/);
  }

  console.log("ok — agent constitution runtime 14/15/19/25");
}

main();
