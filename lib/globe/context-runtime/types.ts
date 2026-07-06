import type { PersonalGlobePinSource } from "@/lib/globe/personal-globe-pin-types";

export type ContextRuntimeItemKind =
  | "pinned_lodging"
  | "pinned_eatery"
  | "globe_pin"
  | "media_guide";

export type ContextRuntimeManageAction =
  | "fly"
  | "unpin"
  | "remove_pin"
  | "remove_media";

export type ContextRuntimeItem = {
  id: string;
  kind: ContextRuntimeItemKind;
  label: string;
  subtitle?: string | null;
  lat?: number | null;
  lng?: number | null;
  previewUrl?: string | null;
  pinned?: boolean;
  pinEventId?: string | null;
  guideNodeId?: string | null;
  pinSource?: PersonalGlobePinSource | null;
  actions: readonly ContextRuntimeManageAction[];
};

export type ContextRuntimeSection = {
  key: "pinned" | "pins" | "media";
  items: readonly ContextRuntimeItem[];
};

export type ContextRuntimeInventory = {
  eventId: string;
  sections: readonly ContextRuntimeSection[];
  totalCount: number;
};
