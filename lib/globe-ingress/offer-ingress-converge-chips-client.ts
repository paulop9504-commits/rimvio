"use client";

/**
 * Ambiguous ingress converge — chips-first only when selectable chips can render.
 * Never leave “골라 주세요” text without chips on the visible surface.
 */

import {
  appendOperatorAskChipsComposeTurn,
  markOperatorAskChipsTurnSubmitted,
  readContextAgentComposeThread,
} from "@/lib/globe/assistant";
import { requestGlobeAskBridgeFocus } from "@/lib/globe/globe-ask-bridge-focus";
import type { IngressContextConvergeResult } from "@/lib/globe-ingress/resolve-ingress-context-converge";
import {
  buildIngressConvergePortalChoices,
  INGRESS_CONVERGE_NEW_VALUE,
} from "@/lib/globe-ingress/build-ingress-converge-portal-choices";
import { copy } from "@/lib/copy/human-ko";
import { canOfferAskChips } from "@/lib/ask/can-offer-ask-chips";

export { INGRESS_CONVERGE_NEW_VALUE, buildIngressConvergePortalChoices };

function closeOpenAskChips(eventId: string): void {
  const rows = readContextAgentComposeThread(eventId);
  for (const row of rows) {
    if (
      row.role === "assistant" &&
      row.kind === "ask_chips" &&
      row.payload.status === "open"
    ) {
      markOperatorAskChipsTurnSubmitted(eventId, row.id, {
        chipId: "superseded",
        summaryKo: "다음 선택으로 이어가요",
      });
    }
  }
}

/** Host chips — returns false when nothing selectable (caller must not show pick hint). */
export function offerIngressConvergeChipsClient(
  result: IngressContextConvergeResult,
): boolean {
  if (result.decision !== "ask_chips" || result.hits.length === 0) {
    return false;
  }
  const top = result.hits[0]!;
  const router = copy.globe.tripSituationRouter;
  const portalChoices = buildIngressConvergePortalChoices(result);
  if (!portalChoices) {
    return false;
  }

  const chips = portalChoices.map((c) => ({
    id:
      c.id === INGRESS_CONVERGE_NEW_VALUE
        ? "ingress_new"
        : `ingress_attach_${c.id}`,
    labelKo: c.labelKo,
    gapId: "ingress_converge",
    value: c.id,
  }));

  if (!canOfferAskChips(chips)) {
    return false;
  }

  closeOpenAskChips(top.eventId);

  const why = top.meaningWhy?.trim() || null;
  const hint = why
    ? `${router.convergeHint}\n${router.convergeWhyPrefix} ${why}`
    : router.convergeHint;

  const turned = appendOperatorAskChipsComposeTurn(top.eventId, {
    chipDomain: "ingress_converge",
    hint,
    pendingTrigger: result.seedUtterance,
    chips,
  });

  if (!turned) {
    return false;
  }

  requestGlobeAskBridgeFocus(top.eventId, "bridge");
  return true;
}
