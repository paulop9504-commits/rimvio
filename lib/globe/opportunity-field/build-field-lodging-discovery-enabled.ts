import type { OpportunityPill } from "@/lib/globe/opportunity-field/types";

const LODGING_PATTERN = /(?:숙소|호텔|잠자|숙박|lodging|hotel)/iu;

export function isFieldLodgingDiscoveryPill(
  pill: Pick<OpportunityPill, "title"> | null | undefined,
): boolean {
  const title = pill?.title?.trim();
  if (!title) {
    return false;
  }
  return LODGING_PATTERN.test(title);
}
