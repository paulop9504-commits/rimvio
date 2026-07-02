import type { FlowStep } from "@/lib/portal/compose-draft/flow-step-types";
import { findNextFlowStep } from "@/lib/portal/compose-draft/flow-step-types";
import { sellItemDraftCanPublish } from "@/lib/portal/compose-draft/draft-utils";
import {
  isSlotFilled,
  hasMeaningfulSellItemDescription,
  type SlotExtras,
} from "@/lib/portal/compose-draft/parse-slot-answer";
import {
  getProductCategorySchema,
  listSlotsForMode,
} from "@/lib/portal/compose-draft/product-category-registry";
import type {
  DescriptionDraftStatus,
  MarketMacroStage,
} from "@/lib/portal/compose-draft/product-taxonomy-registry";
import type {
  ComposeSlotId,
  ProductCategoryId,
} from "@/lib/portal/compose-draft/product-category-types";
import type { SellItemDraft } from "@/lib/portal/compose-draft/types";
import type { PortalComposeRunState } from "@/lib/portal/portal-compose-run-store";

export type SellItemFlowOptions = {
  categoryId?: ProductCategoryId | null;
  detailSlotFill?: boolean;
  slotExtras?: SlotExtras;
  skippedSlots?: readonly ComposeSlotId[];
};

function toSkippedSet(slots: readonly ComposeSlotId[] | undefined): ReadonlySet<ComposeSlotId> {
  return new Set(slots ?? []);
}

/** Required text slots (excl. note) before photo step — matches slot-fill order. */
export function isSellItemBasicInfoComplete(
  draft: Partial<SellItemDraft>,
  categoryId: ProductCategoryId = "generic",
  detailSlotFill = false,
  slotExtras: SlotExtras = {},
  skippedSlots: ReadonlySet<ComposeSlotId> = new Set(),
): boolean {
  const schema = getProductCategorySchema(categoryId);
  const textSlots = listSlotsForMode(schema, detailSlotFill).filter(
    (slotId) => slotId !== "note",
  );
  return textSlots.every((slotId) =>
    isSlotFilled(slotId, draft, slotExtras, skippedSlots),
  );
}

export function resolveSellItemFlow(
  options: SellItemFlowOptions = {},
): readonly FlowStep[] {
  const categoryId = options.categoryId ?? "generic";
  const detailSlotFill = options.detailSlotFill ?? false;
  const slotExtras = options.slotExtras ?? {};
  const skippedSlots = toSkippedSet(options.skippedSlots);

  return [
    {
      key: "basic_info",
      labelKo: "상품 정보",
      slotKey: "productName",
      isComplete: (draft) =>
        isSellItemBasicInfoComplete(
          draft,
          categoryId,
          detailSlotFill,
          slotExtras,
          skippedSlots,
        ),
    },
    {
      key: "photo",
      labelKo: "사진",
      slotKey: "photos",
      isComplete: (draft) => (draft.photos?.length ?? 0) > 0,
    },
    {
      key: "description",
      labelKo: "상품설명",
      slotKey: "note",
      isComplete: (draft) => hasMeaningfulSellItemDescription(draft.note),
    },
    {
      key: "done",
      labelKo: "등록완료",
      slotKey: "status",
      isComplete: (draft) => draft.status === "submitted",
    },
  ] as const;
}

/** Default flow (generic category) — tests & fallbacks. */
export const SELL_ITEM_FLOW = resolveSellItemFlow({ categoryId: "generic" });

export function findNextSellItemFlowStep(
  draft: Partial<SellItemDraft>,
  options: SellItemFlowOptions = {},
): FlowStep | null {
  const flow = resolveSellItemFlow(options);
  return findNextFlowStep(draft, flow.slice(0, -1));
}

export function readSellItemFlowOptionsFromComposeState(
  state: PortalComposeRunState | null | undefined,
): SellItemFlowOptions {
  return {
    categoryId:
      state?.productCategoryId ?? state?.proposedCategoryId ?? "generic",
    detailSlotFill: state?.detailSlotFill ?? false,
    slotExtras: (state?.slotExtras ?? {}) as SlotExtras,
    skippedSlots: (state?.skippedSlots ?? []) as ComposeSlotId[],
  };
}

export function findNextSellItemTextSlot(
  draft: Partial<SellItemDraft>,
  options: SellItemFlowOptions = {},
): ComposeSlotId | null {
  const categoryId = options.categoryId ?? "generic";
  const detailSlotFill = options.detailSlotFill ?? false;
  const slotExtras = options.slotExtras ?? {};
  const skippedSlots = toSkippedSet(options.skippedSlots);
  const schema = getProductCategorySchema(categoryId);
  const textSlots = listSlotsForMode(schema, detailSlotFill).filter(
    (slotId) => slotId !== "note",
  );
  for (const slotId of textSlots) {
    if (!isSlotFilled(slotId, draft, slotExtras, skippedSlots)) {
      return slotId;
    }
  }
  return null;
}

export function sellItemFlowReadyToPublish(draft: Partial<SellItemDraft>): boolean {
  return sellItemDraftCanPublish(draft) && draft.status !== "submitted";
}

export function readSellItemDescriptionStage(input: {
  draft: Partial<SellItemDraft>;
  flowOptions?: SellItemFlowOptions;
  descriptionDraftKo?: string | null;
}): { macroStage: MarketMacroStage; descriptionStatus: DescriptionDraftStatus } {
  const next = findNextSellItemFlowStep(input.draft, input.flowOptions);
  const note = input.draft.note?.trim() ?? "";
  const generatedDraft = input.descriptionDraftKo?.trim() ?? "";

  if (next?.slotKey === "note" && !note) {
    return { macroStage: "description_ready", descriptionStatus: "ready" };
  }
  if (note) {
    return {
      macroStage: "publish_review",
      descriptionStatus: generatedDraft && generatedDraft === note ? "generated" : "edited",
    };
  }
  if (next?.slotKey === "status" || sellItemFlowReadyToPublish(input.draft)) {
    return { macroStage: "publish_review", descriptionStatus: "idle" };
  }
  return { macroStage: "slot_fill", descriptionStatus: "idle" };
}
