import type { ComposeDraftValues, SellItemDraft } from "@/lib/portal/compose-draft/types";

export function mergeComposeDraft(
  base: Partial<SellItemDraft>,
  patch: Partial<SellItemDraft>,
): SellItemDraft {
  return {
    ...base,
    ...(patch.productName?.trim() ? { productName: patch.productName.trim() } : {}),
    ...(patch.priceKrw != null && patch.priceKrw >= 10_000 ? { priceKrw: patch.priceKrw } : {}),
    ...(patch.condition?.trim() ? { condition: patch.condition.trim() } : {}),
    ...(patch.placeLabel?.trim() ? { placeLabel: patch.placeLabel.trim() } : {}),
    ...(patch.note?.trim() ? { note: patch.note.trim() } : {}),
    ...(patch.photos?.length ? { photos: patch.photos } : {}),
    ...(patch.status === "draft" || patch.status === "submitted" ? { status: patch.status } : {}),
    ...(patch.role === "listing" || patch.role === "seeking" ? { role: patch.role } : {}),
  };
}

/** Prefill pass — never overwrite fields the user already filled. */
export function mergeComposeDraftIfEmpty(
  base: Partial<SellItemDraft>,
  patch: Partial<SellItemDraft>,
): Partial<SellItemDraft> {
  const next: Partial<SellItemDraft> = { ...base };
  if (!base.productName?.trim() && patch.productName?.trim()) {
    next.productName = patch.productName.trim();
  }
  if ((base.priceKrw == null || base.priceKrw < 10_000) && patch.priceKrw != null && patch.priceKrw >= 10_000) {
    next.priceKrw = patch.priceKrw;
  }
  if (!base.condition?.trim() && patch.condition?.trim()) {
    next.condition = patch.condition.trim();
  }
  if (!base.placeLabel?.trim() && patch.placeLabel?.trim()) {
    next.placeLabel = patch.placeLabel.trim();
  }
  if (!base.note?.trim() && patch.note?.trim()) {
    next.note = patch.note.trim();
  }
  if (!(base.photos?.length ?? 0) && patch.photos?.length) {
    next.photos = patch.photos;
  }
  if (!base.role && (patch.role === "listing" || patch.role === "seeking")) {
    next.role = patch.role;
  }
  return next;
}

const COMPOSE_DRAFT_VALUE_KEYS: Array<keyof SellItemDraft> = [
  "productName",
  "priceKrw",
  "condition",
  "placeLabel",
  "note",
  "photos",
];

export function composeDraftHasValues(draft: Partial<ComposeDraftValues> | null | undefined): boolean {
  if (!draft) {
    return false;
  }
  return COMPOSE_DRAFT_VALUE_KEYS.some((key) => {
    const value = draft[key];
    if (value === null || value === undefined) {
      return false;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    if (typeof value === "number") {
      return Number.isFinite(value) && value > 0;
    }
    return true;
  });
}

export function missingRequiredSellItemFields(
  draft: Partial<SellItemDraft>,
): Array<keyof SellItemDraft> {
  const missing: Array<keyof SellItemDraft> = [];
  if (!draft.productName?.trim()) {
    missing.push("productName");
  }
  if (draft.priceKrw == null || draft.priceKrw < 10_000) {
    missing.push("priceKrw");
  }
  return missing;
}

export function sellItemDraftCanPublish(draft: Partial<SellItemDraft>): boolean {
  return missingRequiredSellItemFields(draft).length === 0;
}
