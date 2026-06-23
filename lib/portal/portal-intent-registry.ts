import type { PortalCategoryId, PortalIntentId } from "@/lib/portal/portal-types";
import { copy } from "@/lib/copy/human-ko";

export type PortalIntentDef = {
  id: PortalIntentId;
  labelKo: string;
  bodyKo: string;
  emoji: string;
};

export type PortalCategoryDef = {
  id: PortalCategoryId;
  labelKo: string;
  implemented: boolean;
  /** v1 — routes to market projection when true */
  marketProjection?: boolean;
};

const INTENTS: readonly PortalIntentDef[] = [
  {
    id: "offer",
    labelKo: copy.portal.intentOfferTitle,
    bodyKo: copy.portal.intentOfferBody,
    emoji: "📤",
  },
  {
    id: "seek",
    labelKo: copy.portal.intentSeekTitle,
    bodyKo: copy.portal.intentSeekBody,
    emoji: "📥",
  },
  {
    id: "together",
    labelKo: copy.portal.intentTogetherTitle,
    bodyKo: copy.portal.intentTogetherBody,
    emoji: "🤝",
  },
  {
    id: "join",
    labelKo: copy.portal.intentJoinTitle,
    bodyKo: copy.portal.intentJoinBody,
    emoji: "📅",
  },
] as const;

const CATEGORIES_BY_INTENT: Record<PortalIntentId, readonly PortalCategoryDef[]> = {
  offer: [
    { id: "used_goods", labelKo: copy.portal.categoryUsedGoods, implemented: true, marketProjection: true },
    { id: "talent", labelKo: copy.portal.categoryTalent, implemented: false },
    { id: "job", labelKo: copy.portal.categoryJob, implemented: false },
    { id: "real_estate", labelKo: copy.portal.categoryRealEstate, implemented: false },
    { id: "ticket", labelKo: copy.portal.categoryTicket, implemented: false },
    { id: "service", labelKo: copy.portal.categoryService, implemented: false },
  ],
  seek: [
    { id: "used_goods", labelKo: copy.portal.categoryUsedGoods, implemented: true, marketProjection: true },
    { id: "job", labelKo: copy.portal.categoryJob, implemented: false },
    { id: "home", labelKo: copy.portal.categoryHome, implemented: false },
    { id: "ticket", labelKo: copy.portal.categoryTicket, implemented: false },
    { id: "talent", labelKo: copy.portal.categoryTalent, implemented: false },
    { id: "info", labelKo: copy.portal.categoryInfo, implemented: false },
  ],
  together: [
    { id: "companion", labelKo: copy.portal.categoryCompanion, implemented: false },
    { id: "sport", labelKo: copy.portal.categorySport, implemented: false },
    { id: "study", labelKo: copy.portal.categoryStudy, implemented: false },
    { id: "project", labelKo: copy.portal.categoryProject, implemented: false },
    { id: "meetup", labelKo: copy.portal.categoryMeetup, implemented: false },
  ],
  join: [
    { id: "event", labelKo: copy.portal.categoryEvent, implemented: false },
    { id: "ticket", labelKo: copy.portal.categoryTicket, implemented: false },
  ],
};

export function listPortalIntents(): readonly PortalIntentDef[] {
  return INTENTS;
}

export function listPortalCategoriesForIntent(
  intentId: PortalIntentId,
): readonly PortalCategoryDef[] {
  return CATEGORIES_BY_INTENT[intentId];
}

export function getPortalIntent(intentId: PortalIntentId): PortalIntentDef | null {
  return INTENTS.find((row) => row.id === intentId) ?? null;
}

export function getPortalCategory(
  intentId: PortalIntentId,
  categoryId: PortalCategoryId,
): PortalCategoryDef | null {
  return CATEGORIES_BY_INTENT[intentId].find((row) => row.id === categoryId) ?? null;
}

export function portalIntentToMarketRole(
  intentId: PortalIntentId,
): "listing" | "seeking" | null {
  if (intentId === "offer") {
    return "listing";
  }
  if (intentId === "seek") {
    return "seeking";
  }
  return null;
}
