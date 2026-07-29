/**
 * After NEW Context commit — optional Reference Link chips (ADR-030).
 * Cross-Context: market Continuum offers travel links (제주 + 카메라).
 */

import { copy } from "@/lib/copy/human-ko";
import {
  appendContextAgentComposeTurn,
  appendOperatorAskChipsComposeTurn,
} from "@/lib/globe/assistant";
import {
  listLinkableContextCandidates,
  type LinkCandidateTargetKind,
} from "@/lib/context-reference/list-linkable-context-candidates";
import { findLifeEventCandidate } from "@/lib/life-read-model";

function inferTargetKind(
  targetEventId: string,
  explicit?: LinkCandidateTargetKind | null,
): LinkCandidateTargetKind {
  if (explicit) {
    return explicit;
  }
  const event = findLifeEventCandidate(targetEventId);
  if (!event) {
    return "any";
  }
  if (event.metadata?.workspaceKind === "used_goods") {
    return "used_goods";
  }
  if (event.category === "travel" || /여행|출장/u.test(event.title)) {
    return "travel";
  }
  return "any";
}

export function offerContextReferenceChips(input: {
  readonly targetEventId: string;
  readonly utterance?: string | null;
  readonly forTargetKind?: LinkCandidateTargetKind | null;
}): boolean {
  const targetEventId = input.targetEventId.trim();
  if (!targetEventId) {
    return false;
  }
  const forTargetKind = inferTargetKind(
    targetEventId,
    input.forTargetKind,
  );
  const candidates = listLinkableContextCandidates({
    excludeEventId: targetEventId,
    limit: 3,
    forTargetKind,
  });
  if (candidates.length === 0) {
    return false;
  }

  appendContextAgentComposeTurn(targetEventId, {
    role: "assistant",
    kind: "text",
    text:
      forTargetKind === "used_goods"
        ? copy.globe.contextReferenceOfferBodyMarket
        : copy.globe.contextReferenceOfferBody,
  });

  appendOperatorAskChipsComposeTurn(targetEventId, {
    chipDomain: "context_reference",
    hint: copy.globe.contextReferenceOfferHint,
    pendingTrigger: input.utterance?.trim() || "",
    chips: candidates.map((row) => ({
      id: `cref_${row.eventId}_${row.kind}`,
      labelKo: row.chipLabelKo,
      gapId: "context_reference",
      value: `${row.kind}|${row.eventId}`,
    })),
  });
  return true;
}
