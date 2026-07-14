"use client";

/**
 * Ambiguous ingress converge — chips-first (only when auto_attach is unsafe).
 */

import {
  appendContextAgentComposeTurn,
  appendOperatorAskChipsComposeTurn,
} from "@/lib/globe/assistant";
import { requestGlobeAskBridgeFocus } from "@/lib/globe/globe-ask-bridge-focus";
import type { IngressContextConvergeResult } from "@/lib/globe-ingress/resolve-ingress-context-converge";
import { copy } from "@/lib/copy/human-ko";

export const INGRESS_CONVERGE_NEW_VALUE = "__ingress_new__";

/** Host chips on top hit event so Globe compose can render them. */
export function offerIngressConvergeChipsClient(
  result: IngressContextConvergeResult,
): boolean {
  if (result.decision !== "ask_chips" || result.hits.length === 0) {
    return false;
  }
  const top = result.hits[0]!;
  const router = copy.globe.tripSituationRouter;
  const why = top.meaningWhy?.trim() || null;

  appendContextAgentComposeTurn(top.eventId, {
    role: "assistant",
    kind: "text",
    text: why
      ? `${router.convergeHint}\n${router.convergeWhyPrefix} ${why}`
      : router.convergeHint,
  });

  const attachChips = result.hits.slice(0, 3).map((hit) => {
    const label =
      hit.headline.trim() ||
      hit.place?.trim() ||
      router.convergeAttachChipDefault;
    return {
      id: `ingress_attach_${hit.eventId}`,
      labelKo: router.convergeAttachChip(label.slice(0, 18)),
      gapId: "ingress_converge",
      value: hit.eventId,
    };
  });

  appendOperatorAskChipsComposeTurn(top.eventId, {
    chipDomain: "ingress_converge",
    hint: router.convergeHint,
    pendingTrigger: result.seedUtterance,
    chips: [
      ...attachChips,
      {
        id: "ingress_new",
        labelKo: router.convergeNewChip,
        gapId: "ingress_converge",
        value: INGRESS_CONVERGE_NEW_VALUE,
      },
    ],
  });

  requestGlobeAskBridgeFocus(top.eventId, "bridge");
  return true;
}
