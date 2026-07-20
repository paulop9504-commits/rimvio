/**
 * Revise Intent — lodging stay/guest slots → confirm chips (Article 0).
 * Slot write happens only after human apply / soft affirm.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextNlActionResult } from "@/lib/action-planner/context-nl-types";
import {
  buildContextPack,
  readLastContextPack,
  resolveLodgingDiffForPack,
} from "@/lib/context-builder";
import { copy } from "@/lib/copy/human-ko";
import { tryParseLodgingStayRevise } from "@/lib/globe/context-hub/parse-lodging-stay-revise";
import { writeLodgingStayRevisePending } from "@/lib/globe/context-hub/lodging-stay-revise-pending-store";
import { readSessionGraph } from "@/lib/graph-command/session-graph-store";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { classifyIntentFamily } from "@/lib/rule-engine/classify-intent-family";
import { evaluateUtteranceRules } from "@/lib/rule-engine/evaluate-utterance-rules";

export type LodgingStayReviseChip = {
  readonly id: string;
  readonly labelKo: string;
  readonly gapId: string;
  readonly value: string;
};

export function buildLodgingStayReviseConfirmChips(): readonly LodgingStayReviseChip[] {
  return [
    {
      id: "lodging_stay_apply",
      labelKo: copy.globe.lodgingStayReviseApplyChip,
      gapId: "apply",
      value: "apply",
    },
    {
      id: "lodging_stay_cancel",
      labelKo: copy.globe.lodgingStayReviseCancelChip,
      gapId: "cancel",
      value: "cancel",
    },
    {
      id: "lodging_stay_edit",
      labelKo: copy.globe.lodgingStayReviseEditChip,
      gapId: "edit",
      value: "edit",
    },
  ];
}

/**
 * NL / Operator shared entry — pending write + confirm (no Reality mutation yet).
 */
export function tryRunReviseCommand(input: {
  utterance: string;
  contextEventId: string;
  event?: EventCandidate | null;
}): Extract<
  ContextNlActionResult,
  { via: "revise_confirm" | "clarify" }
> | null {
  const text = input.utterance.trim();
  const contextEventId = input.contextEventId.trim();
  if (!text || !contextEventId) {
    return null;
  }

  const intent = classifyIntentFamily(text);
  const event =
    input.event !== undefined
      ? input.event
      : findLifeEventCandidate(contextEventId);
  const graph = readSessionGraph(contextEventId);
  const lodgingDiff =
    readLastContextPack(contextEventId)?.lodgingDiff ??
    resolveLodgingDiffForPack({
      contextEventId,
      graph,
      previous: null,
    });
  const proposal = tryParseLodgingStayRevise({
    text,
    event,
    lodgingDiff,
  });

  if (proposal) {
    writeLodgingStayRevisePending(contextEventId, proposal);
    return {
      ok: true,
      via: "revise_confirm",
      contextEventId,
      assistantReplyKo: proposal.confirmHintKo,
      reservedOpIds: [],
      waitingCommit: false,
      reviseChips: buildLodgingStayReviseConfirmChips(),
    };
  }

  if (intent !== "Revise") {
    return null;
  }

  const ruleDecision = evaluateUtteranceRules({ utterance: text, graph });
  const contextPack = buildContextPack({
    utterance: text,
    graph,
    discoveryPlaceIds: [],
    lodgingDiff,
  });
  return {
    ok: true,
    via: "clarify",
    contextEventId,
    assistantReplyKo: copy.globe.lodgingStayReviseAskHint,
    reservedOpIds: [],
    waitingCommit: false,
    ruleDecision,
    contextPack,
  };
}
