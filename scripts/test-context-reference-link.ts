#!/usr/bin/env npx tsx
/**
 * ADR-030 — Context Reference Link (approved only, no silent merge).
 * Cross-Context: market Continuum offers travel links (제주 + 카메라).
 */

import assert from "node:assert/strict";
import {
  clearContextReferenceLinksForTests,
  createContextReferenceLink,
  listContextReferenceLinks,
  listLinkableContextCandidates,
} from "../lib/context-reference";
import { ensureTripContextEvent } from "../lib/experience-run/ensure-trip-context-event";
import { findLifeEventCandidate } from "../lib/life-read-model";
import { ensureMarketContextEvent } from "../lib/workspace-kind/ensure-market-context-event";
import { composeLinkedReality } from "../lib/reality-os/compose-linked";
import {
  resetContextRealityStoreForTests,
  seedContextRealityBundle,
} from "../lib/reality-os";
import { runWorkspaceIntentContinuum } from "../lib/workspace-kind";
import {
  clearSessionGraphs,
  resetGraphCommandStoreForTests,
} from "../lib/graph-command";
import { clearPreparedRealityOperations } from "../lib/reality-queue";

clearContextReferenceLinksForTests();
resetContextRealityStoreForTests();
resetGraphCommandStoreForTests();
clearSessionGraphs();
clearPreparedRealityOperations();

const jeju = ensureTripContextEvent({
  message: "제주 3박 여행",
  profile: "leisure_travel",
});
const osaka = ensureTripContextEvent({
  message: "오사카 4박 5일 여행",
  profile: "leisure_travel",
});

{
  const candidates = listLinkableContextCandidates({
    excludeEventId: osaka.id,
    limit: 5,
  });
  assert.ok(candidates.some((row) => row.eventId === jeju.id));
}

{
  const linked = createContextReferenceLink({
    targetEventId: osaka.id,
    sourceEventId: jeju.id,
    kind: "style",
  });
  assert.equal(linked.ok, true);
  if (linked.ok) {
    assert.equal(linked.link.approvedByHuman, true);
    assert.equal(linked.link.targetEventId, osaka.id);
    assert.equal(linked.link.sourceEventId, jeju.id);
    assert.ok(linked.link.preferenceLinesKo.length > 0);
  }
  const listed = listContextReferenceLinks(osaka.id);
  assert.equal(listed.length, 1);

  const sourceAfter = findLifeEventCandidate(jeju.id);
  const targetAfter = findLifeEventCandidate(osaka.id);
  assert.ok(sourceAfter);
  assert.ok(targetAfter);
  assert.equal(sourceAfter!.title, jeju.title);
  assert.ok(
    Array.isArray(targetAfter!.metadata?.referencedContextIds) &&
      (targetAfter!.metadata!.referencedContextIds as string[]).includes(
        jeju.id,
      ),
  );
}

{
  const self = createContextReferenceLink({
    targetEventId: osaka.id,
    sourceEventId: osaka.id,
  });
  assert.equal(self.ok, false);
}

{
  const market = ensureMarketContextEvent({
    utterance: "제주에서 쓸 카메라 찾아줘",
  });
  seedContextRealityBundle({
    contextEventId: market.id,
    sdkKind: "used_goods",
    focusSlotId: "conditions",
  });
  const forMarket = listLinkableContextCandidates({
    excludeEventId: market.id,
    forTargetKind: "used_goods",
    limit: 5,
  });
  assert.ok(forMarket.some((row) => row.eventId === jeju.id));
  assert.ok(forMarket.some((row) => /이어서/.test(row.chipLabelKo)));

  const link = createContextReferenceLink({
    targetEventId: market.id,
    sourceEventId: jeju.id,
    kind: "generic",
  });
  assert.equal(link.ok, true);

  seedContextRealityBundle({
    contextEventId: jeju.id,
    sdkKind: "travel",
    focusSlotId: "flight",
  });
  const composed = composeLinkedReality({ targetEventId: market.id });
  assert.ok(composed);
  assert.equal(composed!.links.length, 1);
  assert.ok(composed!.mergedPrimitives.includes("spatial"));
  assert.ok(composed!.mergedPrimitives.includes("object"));
  assert.match(composed!.summaryKo, /연결/);
}

{
  const continuum = runWorkspaceIntentContinuum({
    utterance: "맥북 살만한 거 찾아줘",
    graphId: "graph-xref-market",
    createIfMissing: true,
  });
  assert.ok(continuum);
  const candidates = listLinkableContextCandidates({
    excludeEventId: continuum!.contextEventId,
    forTargetKind: "used_goods",
  });
  assert.ok(candidates.length >= 1);
}

clearContextReferenceLinksForTests();
resetContextRealityStoreForTests();
console.log("ok — context-reference-link");
