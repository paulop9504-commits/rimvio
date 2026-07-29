/**
 * Country / region labels — not city destinations (Execution Space law).
 * Multi-hub countries (PH, JP, ID, …) stay unresolved until hub chip / NL city.
 */

import {
  isMultiHubCountryDestination,
  matchCountryTravelFrame,
} from "@/lib/globe/country-travel-hubs";
import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";

const LEGACY_COUNTRY_OR_REGION =
  /^(?:일본|japan|한국|korea|남한|미국|usa|미국본토|중국|china|대만|taiwan|태국|thailand|베트남|vietnam|프랑스|france|영국|uk|영국본토|싱가포르|singapore|홍콩|hong\s*kong|홍콩섬|필리핀|philippines|인도네시아|indonesia|말레이시아|malaysia|호주|australia|그리스|greece)$/iu;

/** True when label is a country/region — city destination must stay unresolved. */
export function isCountryOrRegionDestinationLabel(
  label: string | null | undefined,
): boolean {
  const trimmed = label?.trim() ?? "";
  if (!trimmed) {
    return false;
  }
  if (isMultiHubCountryDestination(trimmed)) {
    return true;
  }
  if (LEGACY_COUNTRY_OR_REGION.test(trimmed)) {
    return true;
  }
  const overseas = classifyOverseasManualPlace(trimmed);
  if (overseas?.kind === "country") {
    // City-states can act as destinations; multi-hub countries cannot.
    if (isMultiHubCountryDestination(overseas.label)) {
      return true;
    }
    // Short country-only utterance (e.g. "프랑스") → unresolved city
    if (trimmed.length <= 12 && !/[시군구동역]$/u.test(trimmed)) {
      return true;
    }
  }
  return matchCountryTravelFrame(trimmed) != null;
}
