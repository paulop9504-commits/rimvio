/**
 * Country-scale trip — Cursor-style A/B/C QUESTIONS + 「기타」 blank fill.
 */

import { syncPortalComposeClarifyToChat } from "@/lib/globe/chat/sync-portal-compose-to-chat";
import { copy } from "@/lib/copy/human-ko";
import {
  DESTINATION_OTHER_CHIP_ID,
  hubChoiceRowsForCountry,
  pickPromptForCountry,
} from "@/lib/globe/country-travel-hubs";
import { isCountryOrRegionDestinationLabel } from "@/lib/globe-ingress/is-country-or-region-destination";

export const COUNTRY_CITY_SLOT_ID = "country_city_pick";
export const COUNTRY_CITY_OTHER_ID = DESTINATION_OTHER_CHIP_ID;

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function shouldOfferCountryCityPick(
  destinationOrRegion: string | null | undefined,
): boolean {
  return isCountryOrRegionDestinationLabel(destinationOrRegion);
}

/** Cursor-like QUESTIONS chips — A · Paris · B · Nice · … · Z · 기타 */
export function buildCountryCityPickChoices(
  countryLabel: string,
): readonly { id: string; labelKo: string }[] {
  const hubs = hubChoiceRowsForCountry(countryLabel);
  const capped = hubs.slice(0, 8);
  const choices = capped.map((row, index) => ({
    id: row.label,
    labelKo: `${LETTERS[index] ?? String(index + 1)} · ${row.label}`,
  }));
  const otherLetter = LETTERS[capped.length] ?? String(capped.length + 1);
  choices.push({
    id: COUNTRY_CITY_OTHER_ID,
    labelKo: `${otherLetter} · ${copy.globe.tripSituationRouter.destinationOther}`,
  });
  return choices;
}

export function buildCountryCityPickQuestion(countryLabel: string): string {
  const country = countryLabel.trim() || "여행";
  const prompt =
    pickPromptForCountry(country) ??
    copy.globe.tripSituationRouter.countryCityPick(country);
  return `${prompt}\n${copy.globe.tripSituationRouter.destinationOtherAsk}`;
}

/** Chat — A/B/C city QUESTIONS after country-only trip Intent. */
export function offerCountryCityPickChips(input: {
  readonly graphId: string;
  readonly countryLabel: string;
  readonly userText?: string | null;
  readonly skipUserEcho?: boolean;
}): boolean {
  const country = input.countryLabel.trim();
  if (!country || !shouldOfferCountryCityPick(country)) {
    return false;
  }
  return syncPortalComposeClarifyToChat({
    graphId: input.graphId,
    userText: input.skipUserEcho ? "" : input.userText?.trim() || "",
    questionKo: buildCountryCityPickQuestion(country),
    clarifyKind: "slot",
    slotId: COUNTRY_CITY_SLOT_ID,
    choices: buildCountryCityPickChoices(country),
  });
}
