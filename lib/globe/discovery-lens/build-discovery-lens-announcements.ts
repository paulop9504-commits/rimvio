import type { LocalDiscoveryQuestionChoice } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { copy } from "@/lib/copy/human-ko";
import type {
  DiscoveryLens,
  DiscoveryLensSession,
  LensPrefetchBundle,
  LensPrefetchItem,
} from "@/lib/globe/discovery-lens/types";

function inferSpawnReasonKo(choiceLabel: string | null | undefined): string {
  const text = choiceLabel?.trim() ?? "";
  if (/아이|아들|딸|유아|키즈|family|kid/iu.test(text)) {
    return copy.globe.discoveryLensReasonFamily;
  }
  if (/연인|데이트|둘이|커플|couple|date/iu.test(text)) {
    return copy.globe.discoveryLensReasonCouple;
  }
  if (/친구|friend/iu.test(text)) {
    return copy.globe.discoveryLensReasonFriends;
  }
  if (/혼자|solo|나만/iu.test(text)) {
    return copy.globe.discoveryLensReasonSolo;
  }
  if (/쇼핑|shopping/iu.test(text)) {
    return copy.globe.discoveryLensReasonShopping;
  }
  if (/박물관|미술|museum/iu.test(text)) {
    return copy.globe.discoveryLensReasonMuseum;
  }
  if (/공원|힐링|park|nature/iu.test(text)) {
    return copy.globe.discoveryLensReasonPark;
  }
  return copy.globe.discoveryLensReasonGeneral;
}

function countPrefetchByKind(items: readonly LensPrefetchItem[]): {
  activity: number;
  eatery: number;
  lodging: number;
  amenity: number;
} {
  const counts = { activity: 0, eatery: 0, lodging: 0, amenity: 0 };
  for (const item of items) {
    counts[item.kind] += 1;
  }
  return counts;
}

export function buildDiscoveryLensSpawnAnnouncement(input: {
  session: DiscoveryLensSession;
  choice?: LocalDiscoveryQuestionChoice | null;
}): string {
  const reasonKo = inferSpawnReasonKo(
    input.choice?.label ?? input.session.lenses[0]?.spawnedFrom,
  );
  const placeLabels = input.session.lenses.map((lens) => lens.labelKo).join(" · ");
  const lensIds = input.session.lenses.map((lens) => lens.id).join(" · ");
  return copy.globe.discoveryLensSpawnedWhy({
    reasonKo,
    placeLabels,
    lensIds,
    count: input.session.lenses.length,
  });
}

export function buildDiscoveryLensPrefetchReadyAnnouncement(input: {
  lens: DiscoveryLens;
  bundle: LensPrefetchBundle;
}): string | null {
  if (input.bundle.status !== "ready" || input.bundle.items.length === 0) {
    if (input.bundle.status === "empty") {
      return copy.globe.discoveryLensPrefetchEmpty(input.lens.labelKo);
    }
    return null;
  }
  const counts = countPrefetchByKind(input.bundle.items);
  return copy.globe.discoveryLensPrefetchReady({
    labelKo: input.lens.labelKo,
    count: input.bundle.items.length,
    activity: counts.activity,
    eatery: counts.eatery,
    lodging: counts.lodging,
  });
}

export function buildDiscoveryLensLodgingPickAnnouncement(
  session: DiscoveryLensSession,
): string | null {
  if (!session.awaitingLensPick || session.lenses.length < 2) {
    return null;
  }
  const labels = session.lenses.map((row) => row.labelKo).join(" · ");
  return copy.globe.discoveryLensLodgingPick(labels);
}

export function buildDiscoveryLensPickAnnouncement(
  session: DiscoveryLensSession,
): string | null {
  if (!session.awaitingLensPick || session.lenses.length < 2) {
    return null;
  }
  const labels = session.lenses.map((row) => row.labelKo).join(" · ");
  return copy.globe.discoveryLensPickArea(labels);
}
