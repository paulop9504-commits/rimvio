/**
 * Research approval gate — Cursor apply/reject after 납득.
 */
import assert from "node:assert/strict";
import {
  applyResearchApprovalChip,
  buildResearchApprovalGate,
  clearResearchApprovalGate,
  createFixtureCandidateProvider,
  formatResearchApprovalPromptKo,
  formatResearchResultComposeKo,
  readResearchApprovalGate,
  runResearchEngine,
  writeResearchApprovalGate,
} from "../lib/research-engine";

async function main() {
  const strong = buildResearchApprovalGate({
    confidence: 0.82,
    evidenceWeak: false,
    bestTitle: "Nebula Capsule",
    bestCandidateId: "n1",
  });
  assert.ok(strong);
  assert.equal(strong!.offerApply, true);
  assert.match(strong!.promptKo, /이 근거로 진행할까요/);
  assert.ok(strong!.trustSummaryKo.length === 3);
  assert.match(strong!.trustSummaryKo[0]!, /부른 도구/);
  assert.match(formatResearchApprovalPromptKo(strong!), /채운 축/);


  const weak = buildResearchApprovalGate({
    confidence: 0.2,
    evidenceWeak: true,
    bestTitle: "Thin Inn",
    bestCandidateId: "t1",
  });
  assert.ok(weak);
  assert.equal(weak!.offerApply, false);
  assert.ok(!weak!.chips.some((c) => c.value === "apply"));
  assert.ok(weak!.chips.some((c) => c.value === "reject"));

  const engine = await runResearchEngine({
    text: "하루 10만원대 호텔 어디가 좋아?",
    provider: createFixtureCandidateProvider([
      {
        id: "n1",
        title: "Nebula Capsule",
        snippet: "리뷰 200 · ★4.3 · 1박 9만",
        domain: "inventory.lodging.rimvio",
        mediaType: "listing",
        reviewCount: 200,
        popularity: 0.86,
        metadata: { priceKrw: 90_000, lat: 35.69, lng: 139.7 },
      },
    ]),
    anchorLat: 35.6895,
    anchorLng: 139.6917,
    maxNightlyPriceKrw: 100_000,
    strategy: "budget_first",
  });

  assert.ok(engine.approvalGate);
  assert.equal(engine.approvalGate!.status, "waiting_approval");
  assert.match(engine.approvalGate!.promptKo, /진행할까요/);
  const compose = formatResearchResultComposeKo(engine);
  assert.match(compose, /승인:/);
  assert.match(compose, /이 근거로 진행|조건 바꿔 다시|거절/);

  writeResearchApprovalGate("ctx-approval", {
    status: "waiting_approval",
    promptKo: engine.approvalGate!.promptKo,
    confidence: engine.confidence,
    bestTitle: engine.decision.best.title,
    bestCandidateId: engine.decision.best.candidateId,
    sectorSummariesKo: [],
    sourceUtterance: "호텔 어디가 좋아?",
    createdAtIso: new Date().toISOString(),
  });

  const applied = applyResearchApprovalChip({
    contextEventId: "ctx-approval",
    turnId: "turn-1",
    chipId: "apply",
    value: "apply",
    labelKo: "이 근거로 진행",
  });
  assert.equal(applied.decision, "apply");
  assert.equal(readResearchApprovalGate("ctx-approval")?.status, "approved");

  clearResearchApprovalGate("ctx-approval");
  writeResearchApprovalGate("ctx-reject", {
    status: "waiting_approval",
    promptKo: "?",
    confidence: 0.5,
    bestTitle: "X",
    bestCandidateId: "x",
    sectorSummariesKo: [],
    sourceUtterance: "?",
    createdAtIso: new Date().toISOString(),
  });
  const rejected = applyResearchApprovalChip({
    contextEventId: "ctx-reject",
    turnId: "turn-2",
    chipId: "reject",
    value: "reject",
    labelKo: "이 결과 거절",
  });
  assert.equal(rejected.decision, "reject");
  assert.equal(readResearchApprovalGate("ctx-reject"), null);

  console.log(
    `✓ research approval gate — apply=${strong!.chips.find((c) => c.value === "apply")?.labelKo}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
