/**
 * Job Boundary persist + Target pivot (맛집도).
 * Run: npx tsx scripts/test-workspace-job-boundary.ts
 */
import assert from "node:assert/strict";
import { beginAgentJob } from "@/lib/agent-policy/agent-job";
import { resolveWorkspaceJobBoundary } from "@/lib/agent-policy/resolve-workspace-job-boundary";
import { runAgentP0Guards } from "@/lib/agent-policy/run-agent-p0-guards";
import {
  clearContextWorkspace,
  readContextWorkspace,
  writeContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";

{
  const soft = resolveWorkspaceJobBoundary({
    utterance: "더 싸게",
    hasVisibleCandidates: true,
  });
  assert.equal(soft.switchJob, false);
  assert.equal(soft.abortSoftContinue, false);
  assert.equal(soft.mutation.mode, "refine");
}

{
  const near = resolveWorkspaceJobBoundary({
    utterance: "모리노미아역 근처 호텔좀 찾아줘",
    hasVisibleCandidates: true,
  });
  assert.equal(near.switchJob, true);
  assert.equal(near.abortSoftContinue, true);
  assert.equal(near.mutation.mode, "replace");
  assert.equal(near.mutation.reason, "clear_location");
  assert.equal(near.nextTarget, "lodging");
}

{
  const stop = resolveWorkspaceJobBoundary({
    utterance: "그만해",
    hasVisibleCandidates: true,
  });
  assert.equal(stop.switchJob, true);
  assert.equal(stop.abortSoftContinue, true);
}

{
  const cont = resolveWorkspaceJobBoundary({
    utterance: "계속해",
    hasVisibleCandidates: true,
  });
  assert.equal(cont.isContinueCue, true);
  assert.equal(cont.switchJob, false);
  assert.equal(cont.abortSoftContinue, false);
}

{
  const patch = resolveWorkspaceJobBoundary({
    utterance: "캡슐호텔만 보여줘",
    hasVisibleCandidates: true,
    patchKind: "replace_entity",
  });
  assert.equal(patch.switchJob, true);
  assert.equal(patch.abortSoftContinue, true);
}

// Target pivot: Job A lodging → 「맛집도」 = Job B
{
  const lodgingJob = beginAgentJob({
    utterance: "난바역 근처 호텔 찾아줘",
    intent: "discover",
    target: "lodging",
  });
  assert.equal(lodgingJob.target, "lodging");
  assert.ok(lodgingJob.goalKo.length > 0);
  assert.equal(lodgingJob.status, "active");

  const pivot = resolveWorkspaceJobBoundary({
    utterance: "맛집도 찾아줘",
    hasVisibleCandidates: true,
    previousJob: lodgingJob,
  });
  assert.equal(pivot.nextTarget, "eatery");
  assert.equal(pivot.switchJob, true);
  assert.equal(pivot.abortSoftContinue, true);
}

// Persist via P0 guards
{
  const ctx = `job_persist_${Date.now()}`;
  clearContextWorkspace(ctx);
  openMapContextWorkspace({
    contextEventId: ctx,
    domain: "lodging",
    query: "오사카 호텔",
    summaryKo: "호텔",
    candidates: [
      {
        id: "lodging:test:1",
        labelKo: "Test Hotel",
        lat: 34.67,
        lng: 135.5,
        rating: 4,
        walkMinutes: 5,
        amountLabel: null,
        priceBand: null,
        source: "catalog",
      },
    ],
    source: "scout_patch",
  });

  const g1 = runAgentP0Guards({
    contextEventId: ctx,
    utterance: "난바역 근처 호텔 찾아줘",
  });
  assert.equal(g1.job.target, "lodging");
  assert.equal(g1.switchJob, true);

  const mid = readContextWorkspace(ctx);
  assert.ok(mid?.agentJob);
  assert.equal(mid!.agentJob!.id, g1.job.id);
  assert.equal(mid!.agentJob!.target, "lodging");

  const g2 = runAgentP0Guards({
    contextEventId: ctx,
    utterance: "맛집도 찾아줘",
  });
  assert.equal(g2.switchJob, true);
  assert.equal(g2.abortSoftContinue, true);
  assert.equal(g2.job.target, "eatery");
  assert.notEqual(g2.job.id, g1.job.id);

  const after = readContextWorkspace(ctx);
  assert.equal(after?.agentJob?.target, "eatery");
  assert.equal(after?.agentJob?.id, g2.job.id);

  clearContextWorkspace(ctx);
}

console.log(
  "ok — workspace job boundary (soft stay · clear switch · Target pivot · persist)",
);
