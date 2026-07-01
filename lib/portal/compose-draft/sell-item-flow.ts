import type { FlowStep } from "@/lib/portal/compose-draft/flow-step-types";
import { sellItemDraftCanPublish } from "@/lib/portal/compose-draft/draft-utils";
import type { SellItemDraft } from "@/lib/portal/compose-draft/types";

export const SELL_ITEM_FLOW: readonly FlowStep[] = [
  {
    key: "basic_info",
    labelKo: "상품 정보",
    slotKey: "productName",
    isComplete: (draft) =>
      Boolean(draft.productName?.trim() && draft.priceKrw != null && draft.priceKrw >= 10_000),
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
    isComplete: (draft) => Boolean(draft.note?.trim()),
  },
  {
    key: "done",
    labelKo: "등록완료",
    slotKey: "status",
    isComplete: (draft) => draft.status === "submitted",
  },
] as const;

export function sellItemFlowReadyToPublish(draft: Partial<SellItemDraft>): boolean {
  return sellItemDraftCanPublish(draft) && draft.status !== "submitted";
}
