/** Compose draft schema ids — registry SSOT. */
export type ComposeSchemaId =
  | "sell_item"
  | "rent_property"
  | "hire_job"
  | "social_post";

export type ComposeDraftRole = "listing" | "seeking";

export type SellItemDraft = {
  productName?: string | null;
  priceKrw?: number | null;
  condition?: string | null;
  placeLabel?: string | null;
  note?: string | null;
  role?: ComposeDraftRole | null;
  photos?: string[] | null;
  status?: "draft" | "submitted" | null;
};

export type ComposeDraftValues = SellItemDraft;

export type ComposeMessage = {
  role: "user" | "assistant";
  text: string;
};

export type ComposeDraftFieldDef = {
  id: keyof SellItemDraft;
  labelKo: string;
  required: boolean;
  inputType: "text" | "number" | "textarea";
};
