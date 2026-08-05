/**
 * P1 Agent Trust Guards smoke.
 * Run: npx tsx scripts/test-agent-p1-guards.ts
 */
import assert from "node:assert/strict";
import {
  clearContextWorkspace,
  openMapContextWorkspace,
  writeContextWorkspace,
  readContextWorkspace,
} from "@/lib/context-workspace";
import {
  runAgentP1Guards,
  stampAgentIdempotencyKey,
  evaluateAgentGuardPipeline,
} from "@/lib/agent-policy/run-agent-p1-guards";
import { classifyAgentJobTurn } from "@/lib/agent-policy/classify-agent-job-turn";
import { resolveAgentActionLevel } from "@/lib/agent-policy/action-level-gate";
import { resolveConstraintCarryOver } from "@/lib/agent-policy/constraint-carry-over";
import { emptyConstraintMemory } from "@/lib/agent-policy/constraint-memory";
import { resolveAmbiguityGate } from "@/lib/agent-policy/ambiguity-gate";
import { resolveMutationScopeGuard } from "@/lib/agent-policy/mutation-scope-guard";
import { beginAgentJob } from "@/lib/agent-policy/agent-job";

const bag = (partial: Partial<ReturnType<typeof emptyConstraintMemory>>) => ({
  ...emptyConstraintMemory(),
  ...partial,
  updatedAtIso: new Date().toISOString(),
});

const CTX = "ctx_p1_guards";
clearContextWorkspace(CTX);
openMapContextWorkspace({
  contextEventId: CTX,
  domain: "lodging",
  query: "난바 숙소",
  summaryKo: "Namba Trip",
  candidates: [],
});

{
  const a = resolveAgentActionLevel("난바역 근처 호텔 찾아줘");
  assert.equal(a.discoverOnly, true);
  assert.equal(a.allowPrepare, false);
  const b = resolveAgentActionLevel("이 호텔 예약 준비해줘");
  assert.equal(b.allowPrepare, true);
  const c = resolveAgentActionLevel("호텔 찾아주고 예약 준비해");
  assert.equal(c.discoverOnly, true);
  assert.equal(c.allowPrepare, false);
}

{
  const amb = resolveAmbiguityGate({
    utterance: "여기 근처 호텔 찾아줘",
    contextEventId: CTX,
  });
  assert.equal(amb.ok, false);
}

{
  // Target stack「맛집도」— keep spatial, drop stayType (lodging → eatery)
  const carry = resolveConstraintCarryOver({
    utterance: "맛집도 찾아줘",
    previousBag: bag({
      nearLabelKo: "난바",
      stayType: "capsule",
    }),
    switchJob: true,
    previousTarget: "lodging",
    nextTarget: "eatery",
  });
  assert.equal(carry.droppedNear, false);
  assert.equal(carry.bagForScout.nearLabelKo, "난바");
  assert.equal(carry.inheritedSpatialFromStack, true);
  assert.equal(carry.droppedStayType, true);
}

{
  // Bare new job without deixis/stack → drop near
  const bare = resolveConstraintCarryOver({
    utterance: "호텔 찾아줘",
    previousBag: bag({
      nearLabelKo: "난바",
      stayType: "hotel",
    }),
    switchJob: true,
    previousTarget: "lodging",
    nextTarget: "lodging",
  });
  assert.equal(bare.droppedNear, true);
  assert.equal(bare.bagForScout.nearLabelKo, null);
}

{
  // Destination pivot → drop previous near
  const dest = resolveConstraintCarryOver({
    utterance: "후쿠오카 맛집 찾아줘",
    previousBag: bag({
      nearLabelKo: "난바",
    }),
    switchJob: true,
    previousTarget: "lodging",
    nextTarget: "eatery",
  });
  assert.equal(dest.droppedNear, true);
  assert.equal(dest.bagForScout.nearLabelKo, null);
}

{
  const keep = resolveConstraintCarryOver({
    utterance: "거기서 저녁 먹을 맛집도",
    previousBag: bag({
      nearLabelKo: "난바",
      stayType: "hotel",
    }),
    switchJob: true,
    previousTarget: "lodging",
    nextTarget: "eatery",
  });
  assert.equal(keep.droppedNear, false);
  assert.equal(keep.bagForScout.nearLabelKo, "난바");
}

{
  const scope = resolveMutationScopeGuard({
    utterance: "일정 전체 다시 짜줘",
  });
  assert.equal(scope.ok, false);
}

writeContextWorkspace({
  ...readContextWorkspace(CTX)!,
  constraintMemory: bag({
    nearLabelKo: "난바",
    stayType: "hotel",
  }),
});

const first = runAgentP1Guards({
  contextEventId: CTX,
  utterance: "오사카 호텔 찾아줘",
});
assert.equal(first.ok, true);
if (!first.ok) throw new Error("expected pass");
assert.equal(first.discoverOnly, true);
assert.equal(first.allowPrepare, false);

stampAgentIdempotencyKey({
  contextEventId: CTX,
  key: first.idempotencyKey,
});
const dup = runAgentP1Guards({
  contextEventId: CTX,
  utterance: "오사카 호텔 찾아줘",
});
assert.equal(dup.ok, false);
if (!dup.ok) assert.equal(dup.code, "idempotent");

{
  // Job Classification before Preflight — Target stack is new_job
  writeContextWorkspace({
    ...readContextWorkspace(CTX)!,
    agentJob: beginAgentJob({
      utterance: "난바 호텔",
      intent: "discover",
      target: "lodging",
    }),
    lastIdempotencyKey: null,
    lastIdempotencyAtIso: null,
  });
  const cls = classifyAgentJobTurn({
    utterance: "맛집도 찾아줘",
    hasVisibleCandidates: false,
    previousJob: readContextWorkspace(CTX)!.agentJob,
  });
  assert.equal(cls.kind, "new_job");
  assert.equal(cls.boundary.switchJob, true);

  // evaluate = judgment only — does not stamp idempotency
  const judged = evaluateAgentGuardPipeline({
    contextEventId: CTX,
    utterance: "더 싼 호텔",
  });
  assert.equal(judged.ok, true);
  if (judged.ok) {
    assert.equal(judged.decision.action, "CONTINUE");
    assert.ok(judged.payload.idempotencyKey.includes("::"));
  }
  assert.equal(readContextWorkspace(CTX)?.lastIdempotencyKey ?? null, null);
}

clearContextWorkspace(CTX);
console.log("ok — agent guard pipeline (classify · P1 · carry policy · idem)");
