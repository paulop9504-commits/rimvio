import type { IntentState } from "@/lib/portal/compose-intent/intent-state-types";
import type {
  DescriptionDraftStatus,
  MarketMacroStage,
  ProductTaxonomyLeafId,
  ProductTaxonomyStatus,
} from "@/lib/portal/compose-draft/product-taxonomy-registry";
import type {
  MarketCategoryId,
  MarketIntentRole,
} from "@/lib/globe/market/market-intent-types";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import type {
  ComposeClarifyKind,
  ProductCategoryId,
  ProductCategoryStatus,
} from "@/lib/portal/compose-draft/product-category-types";
import type { SellItemDraft } from "@/lib/portal/compose-draft/types";
import type { ComposeSchemaId } from "@/lib/portal/compose-draft/types";
import type { PortalSocialSlotId } from "@/lib/portal/portal-social-slots";
import type { PortalCategoryId, PortalIntentId } from "@/lib/portal/portal-types";

const STORAGE_KEY = "rimvio.portal-compose-run.v1";

export type PortalComposeRunState = {
  graphId: string;
  intentId: PortalIntentId;
  categoryId: PortalCategoryId | null;
  composeSeed: string;
  accumulatedText: string;
  eventId: string;
  pendingSlotId: string | null;
  askedCount: number;
  status: "waiting_slot" | "conversing" | "drafting" | "ready";
  macroStage?: MarketMacroStage;
  intentStage?: IntentState | null;
  marketRole?: MarketIntentRole | null;
  composeSchemaId?: ComposeSchemaId | null;
  composeDraft?: Partial<SellItemDraft> | null;
  marketDraft?: MarketIntentDraft | null;
  socialSlots?: Partial<Record<PortalSocialSlotId, string>>;
  taxonomyStatus?: ProductTaxonomyStatus;
  taxonomyLeafId?: ProductTaxonomyLeafId | null;
  taxonomyCandidateIds?: ProductTaxonomyLeafId[] | null;
  productCategoryId?: ProductCategoryId | null;
  productCategoryStatus?: ProductCategoryStatus;
  proposedCategoryId?: ProductCategoryId | null;
  marketCategoryId?: MarketCategoryId | null;
  pendingClarifyKind?: ComposeClarifyKind | null;
  slotExtras?: Partial<Record<string, string>> | null;
  skippedSlots?: string[] | null;
  detailSlotFill?: boolean;
  pendingPriceConfirmKrw?: number | null;
  descriptionStatus?: DescriptionDraftStatus;
  descriptionDraftKo?: string | null;
  updatedAt: string;
};

let activeState: PortalComposeRunState | null = null;

export function readPortalComposeRunState(
  graphId?: string | null,
): PortalComposeRunState | null {
  if (typeof window === "undefined") {
    if (!graphId?.trim()) {
      return activeState;
    }
    return activeState?.graphId === graphId.trim() ? activeState : null;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PortalComposeRunState;
    if (graphId?.trim() && parsed.graphId !== graphId.trim()) {
      return null;
    }
    activeState = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function writePortalComposeRunState(state: PortalComposeRunState): void {
  activeState = state;
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // session full — memory-only
  }
}

export function clearPortalComposeRunState(graphId?: string | null): void {
  if (graphId?.trim() && activeState?.graphId !== graphId.trim()) {
    return;
  }
  activeState = null;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export function resetPortalComposeRunStoreForTests(): void {
  clearPortalComposeRunState();
}
