/**
 * Portal-visible converge choices (pure — safe for dispatch / tests).
 */

import type { IngressContextConvergeResult } from "@/lib/globe-ingress/resolve-ingress-context-converge";
import { canOfferAskChips } from "@/lib/ask/can-offer-ask-chips";
import { copy } from "@/lib/copy/human-ko";

export const INGRESS_CONVERGE_NEW_VALUE = "__ingress_new__";

export function buildIngressConvergePortalChoices(
  result: IngressContextConvergeResult,
): readonly { id: string; labelKo: string }[] | null {
  if (result.decision !== "ask_chips" || result.hits.length === 0) {
    return null;
  }
  const router = copy.globe.tripSituationRouter;
  const choices = [
    ...result.hits.slice(0, 3).map((hit) => {
      const label =
        hit.headline.trim() ||
        hit.place?.trim() ||
        router.convergeAttachChipDefault;
      return {
        id: hit.eventId,
        labelKo: router.convergeAttachChip(label.slice(0, 18)),
      };
    }),
    {
      id: INGRESS_CONVERGE_NEW_VALUE,
      labelKo: router.convergeNewChip,
    },
  ];
  return canOfferAskChips(choices) ? choices : null;
}
