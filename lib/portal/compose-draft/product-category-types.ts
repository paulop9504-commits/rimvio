/** Product category for dynamic slot-filling questions (L3 registry). */
export type ProductCategoryId =
  | "smartphone"
  | "laptop"
  | "clothing"
  | "furniture"
  | "generic";

export type ComposeSlotId =
  | "productName"
  | "storage"
  | "condition"
  | "priceKrw"
  | "placeLabel"
  | "note"
  | "cpuRam"
  | "sizeLabel";

export type ProductCategorySchema = {
  id: ProductCategoryId;
  labelKo: string;
  classifyPattern: RegExp;
  requiredSlots: readonly ComposeSlotId[];
  optionalSlots: readonly ComposeSlotId[];
  slotOrder: readonly ComposeSlotId[];
  questions: Partial<Record<ComposeSlotId, string>>;
  slotChoices?: Partial<Record<ComposeSlotId, readonly string[]>>;
};

export type ProductCategoryStatus = "unset" | "proposed" | "confirmed" | "picking";

export type ComposeClarifyKind =
  | "slot"
  | "category_confirm"
  | "category_pick"
  | "price_confirm"
  /** Travel Context Draft create gate —「생성」/「취소」 */
  | "context_create"
  /** Context Anchor move confirm —「확인」/「취소」 */
  | "context_anchor_move";
