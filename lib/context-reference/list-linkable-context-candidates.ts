/**
 * Candidates to offer as optional Reference Links when a NEW Context is born.
 * Complementary: market ↔ travel (ADR-030 · ADR-034 Cross-Context).
 */

import { copy } from "@/lib/copy/human-ko";
import type { LinkableContextCandidate } from "@/lib/context-reference/types";
import { listLifeEventCandidates } from "@/lib/life-read-model";
import type { EventCandidate } from "@/lib/events/event-candidate";

export type LinkCandidateTargetKind =
  | "travel"
  | "used_goods"
  | "driver"
  | "any";

function isTravelContext(event: EventCandidate): boolean {
  const title = event.title.trim();
  return (
    event.category === "travel" ||
    /여행|출장|맛집|숙소|trip/iu.test(title)
  );
}

function isMarketContext(event: EventCandidate): boolean {
  const meta = event.metadata ?? {};
  if (meta.workspaceKind === "used_goods") {
    return true;
  }
  const title = event.title.trim();
  return /판매|구매|중고|거래/u.test(title);
}

function passesFilter(
  event: EventCandidate,
  forTargetKind: LinkCandidateTargetKind,
): boolean {
  if (forTargetKind === "used_goods") {
    // New market Context → link existing trip Reality.
    return isTravelContext(event);
  }
  if (forTargetKind === "travel") {
    // New trip → style from prior trips OR gear/buy Contexts.
    return isTravelContext(event) || isMarketContext(event);
  }
  if (forTargetKind === "driver") {
    return isTravelContext(event);
  }
  return isTravelContext(event) || isMarketContext(event);
}

export function listLinkableContextCandidates(input: {
  readonly excludeEventId: string;
  readonly limit?: number;
  /** What was just created — picks complementary candidates. */
  readonly forTargetKind?: LinkCandidateTargetKind;
}): readonly LinkableContextCandidate[] {
  const exclude = input.excludeEventId.trim();
  const limit = input.limit ?? 3;
  const forTargetKind = input.forTargetKind ?? "any";

  const rows = listLifeEventCandidates()
    .filter((event) => {
      if (event.id === exclude) {
        return false;
      }
      return passesFilter(event, forTargetKind);
    })
    .slice(0, 16);

  const out: LinkableContextCandidate[] = [];
  for (const event of rows) {
    const title = event.title.trim() || "이전 맥락";
    const place = event.place?.trim() || null;
    const market = isMarketContext(event);
    const isFood = /맛집|카페|식당/u.test(title);

    let kind: LinkableContextCandidate["kind"] = "style";
    let chipLabelKo: string;
    if (forTargetKind === "used_goods" && isTravelContext(event)) {
      kind = "generic";
      chipLabelKo = copy.globe.contextReferenceChipTogether(title.slice(0, 14));
    } else if (market) {
      kind = "generic";
      chipLabelKo = copy.globe.contextReferenceChipTogether(title.slice(0, 14));
    } else if (isFood) {
      kind = "preference";
      chipLabelKo = copy.globe.contextReferenceChipFood(title.slice(0, 12));
    } else {
      kind = "style";
      chipLabelKo = copy.globe.contextReferenceChipStyle(title.slice(0, 12));
    }

    out.push({
      eventId: event.id,
      titleKo: title,
      placeKo: place,
      kind,
      chipLabelKo,
    });
    if (out.length >= limit) {
      break;
    }
  }
  return out;
}
