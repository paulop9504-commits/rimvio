import { copy } from "@/lib/copy/human-ko";
import {
  composeDraftHasValues,
  missingRequiredSellItemFields,
} from "@/lib/portal/compose-draft/draft-utils";
import type { ComposeSchemaId, SellItemDraft } from "@/lib/portal/compose-draft/types";

export function buildComposeIntentReply(schemaId: ComposeSchemaId): string {
  switch (schemaId) {
    case "sell_item":
      return copy.portal.composeDraftIntentSellItem;
    case "rent_property":
      return copy.portal.composeDraftIntentRent;
    case "hire_job":
      return copy.portal.composeDraftIntentHire;
    case "social_post":
      return copy.portal.composeDraftIntentSocial;
    default: {
      const _exhaustive: never = schemaId;
      return _exhaustive;
    }
  }
}

export function buildComposeDraftReply(input: {
  schemaId: ComposeSchemaId;
  draft: Partial<SellItemDraft>;
  isResume: boolean;
}): string {
  if (!composeDraftHasValues(input.draft)) {
    return buildComposeIntentReply(input.schemaId);
  }

  const missing = missingRequiredSellItemFields(input.draft);
  if (missing.length === 0) {
    return copy.portal.composeDraftReady;
  }
  if (missing.includes("priceKrw") && input.draft.productName?.trim()) {
    return copy.portal.composeDraftNeedPrice(input.draft.productName.trim());
  }
  if (missing.includes("productName") && input.draft.priceKrw) {
    return copy.portal.composeDraftNeedProduct;
  }
  return input.isResume
    ? copy.portal.composeDraftPartialResume
    : copy.portal.composeDraftPartial;
}
