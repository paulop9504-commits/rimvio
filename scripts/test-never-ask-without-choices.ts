/**
 * Never “골라 주세요” without selectable chips.
 * Run: npx tsx scripts/test-never-ask-without-choices.ts
 */

import assert from "node:assert/strict";
import {
  hasSelectableAskChoices,
  requireSelectableAskChoices,
} from "@/lib/ask/never-ask-without-choices";
import { canOfferAskChips } from "@/lib/ask/can-offer-ask-chips";
import {
  buildIngressConvergePortalChoices,
} from "@/lib/globe-ingress/build-ingress-converge-portal-choices";
import {
  isActionableTripWorkUtterance,
  resolveIngressContextConverge,
} from "@/lib/globe-ingress/resolve-ingress-context-converge";
import { syncPortalComposeClarifyToChat } from "@/lib/globe/chat/sync-portal-compose-to-chat";

assert.equal(hasSelectableAskChoices([]), false);
assert.equal(hasSelectableAskChoices(null), false);
assert.equal(
  hasSelectableAskChoices([{ id: "a", labelKo: "A호텔" }]),
  true,
);
assert.equal(requireSelectableAskChoices([]), null);
assert.equal(canOfferAskChips([]), false);

assert.equal(isActionableTripWorkUtterance("도쿄 4박5일 계획 세워"), true);
assert.equal(
  resolveIngressContextConverge({
    utterance: "도쿄 4박5일 계획 세워",
    events: [
      {
        id: "e1",
        title: "도쿄 여행",
        category: "travel",
        source: "chat",
        lifecycle: "active",
        datetime: "2026-07-01T00:00:00.000Z",
        place: "도쿄",
        confidence: 0.9,
        metadata: {},
        lifecycleUpdatedAt: "2026-07-01T00:00:00.000Z",
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z",
      },
    ],
  }).decision,
  "create_new",
);

assert.equal(
  buildIngressConvergePortalChoices({
    seedUtterance: "여행",
    decision: "ask_chips",
    hits: [],
  }),
  null,
);

assert.equal(
  syncPortalComposeClarifyToChat({
    graphId: "g-test",
    userText: "x",
    questionKo: "골라 주세요",
    clarifyKind: "slot",
    slotId: "ingress_converge",
    choices: [],
  }),
  false,
);

console.log("OK — never-ask-without-choices");
