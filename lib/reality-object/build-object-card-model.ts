/**
 * Build Object Card view-model from Reality Object + optional Bloom nearby.
 */

import { capabilitiesForObjectType } from "@/lib/reality-object/capabilities-for-type";
import { detectRealityObjectType } from "@/lib/reality-object/detect-reality-object-type";
import { visualLayerRuleForType } from "@/lib/visual-projection/visual-layer-rules";
import type {
  ObjectCardFact,
  ObjectCardModelV1,
  ObjectCardNearbyRow,
  ObjectCardTabId,
} from "@/lib/reality-object/object-card-types";
import type {
  RealityObjectV1,
  RealityPinCompatKind,
} from "@/lib/reality-object/types";
import { capabilitiesForDiscoveryCard } from "@/lib/reality-object/gate-place-info-actions";

function ratingLabel(rating: number | null | undefined): string | null {
  if (rating == null || !Number.isFinite(rating)) {
    return null;
  }
  return rating.toFixed(1);
}

function factsFromObject(object: RealityObjectV1): ObjectCardFact[] {
  const facts: ObjectCardFact[] = [];
  const o = object.ontology;
  if (o.category?.trim()) {
    facts.push({ id: "category", labelKo: o.category.trim() });
  }
  if (o.openingHours?.trim()) {
    facts.push({ id: "hours", labelKo: o.openingHours.trim() });
  }
  if (o.phone?.trim()) {
    facts.push({ id: "phone", labelKo: o.phone.trim() });
  }
  if (o.description?.trim()) {
    facts.push({
      id: "desc",
      labelKo:
        o.description.trim().length > 90
          ? `${o.description.trim().slice(0, 89)}…`
          : o.description.trim(),
    });
  }
  if (o.reservationSupport) {
    facts.push({ id: "reservable", labelKo: "예약 가능" });
  }
  if (o.paymentSupport) {
    facts.push({ id: "payable", labelKo: "결제 가능" });
  }
  if (facts.length === 0) {
    const rule = visualLayerRuleForType(object.objectType);
    facts.push({ id: "visual", labelKo: rule.labelKo });
  }
  return facts;
}

function galleryFromObject(object: RealityObjectV1): string[] {
  const urls: string[] = [];
  const cover = object.coverImageUrl?.trim();
  if (cover) {
    urls.push(cover);
  }
  for (const url of object.ontology.images ?? []) {
    const trimmed = url?.trim();
    if (trimmed && !urls.includes(trimmed)) {
      urls.push(trimmed);
    }
  }
  return urls.slice(0, 8);
}

export function buildObjectCardModel(input: {
  object?: RealityObjectV1 | null;
  title: string;
  pinKind: RealityPinCompatKind;
  coverImageUrl?: string | null;
  categoryLabel?: string | null;
  nearby?: readonly ObjectCardNearbyRow[];
  executionReady?: boolean;
  preferredTab?: ObjectCardTabId | null;
}): ObjectCardModelV1 {
  const executionReady = Boolean(input.executionReady);
  const object = input.object ?? null;
  const title = object?.title?.trim() || input.title.trim() || "장소";
  const objectType = object
    ? object.objectType
    : detectRealityObjectType({
        title,
        pinKind: input.pinKind,
        categoryLabel: input.categoryLabel,
      });
  const typeLabel = visualLayerRuleForType(objectType).labelKo;
  const cover =
    object?.coverImageUrl?.trim() ||
    input.coverImageUrl?.trim() ||
    null;
  const facts = object
    ? factsFromObject(object)
    : [
        {
          id: "visual",
          labelKo: typeLabel,
        },
        ...(input.categoryLabel?.trim()
          ? [{ id: "category", labelKo: input.categoryLabel.trim() }]
          : []),
      ];
  const galleryUrls = object
    ? galleryFromObject(object)
    : cover
      ? [cover]
      : [];
  const capabilities = object
    ? object.execution.capabilities
    : capabilitiesForDiscoveryCard({
        kind: input.pinKind,
        title,
        categoryLabel: input.categoryLabel,
      });
  const nearby = (input.nearby ?? []).slice(0, 6);
  const preferred = input.preferredTab;
  const defaultTab: ObjectCardTabId =
    preferred &&
    (preferred !== "execution" || executionReady)
      ? preferred
      : executionReady
        ? "execution"
        : "information";

  return {
    title,
    objectTypeLabelKo: typeLabel,
    coverImageUrl: cover,
    ratingLabel: ratingLabel(object?.ontology.rating),
    facts,
    galleryUrls,
    nearby,
    capabilities: capabilities.length
      ? capabilities
      : capabilitiesForObjectType(objectType),
    executionReady,
    defaultTab,
  };
}
