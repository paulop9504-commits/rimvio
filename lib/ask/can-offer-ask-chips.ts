/**
 * Guard helpers for operator ask_chips / clarify — no empty pick UI.
 */

import {
  hasSelectableAskChoices,
  type SelectableAskChoice,
} from "@/lib/ask/never-ask-without-choices";

export function canOfferAskChips(
  chips: readonly SelectableAskChoice[] | null | undefined,
): boolean {
  return hasSelectableAskChoices(chips);
}
