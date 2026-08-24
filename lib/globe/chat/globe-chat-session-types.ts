import type { ComposeClarifyKind } from "@/lib/portal/compose-draft/product-category-types";

export type GlobeChatTextMessage = {
  id: string;
  role: "user" | "assistant";
  kind: "text";
  text: string;
  createdAt: string;
};

export type GlobeChatImageMessage = {
  id: string;
  role: "user";
  kind: "image";
  localUrl: string;
  remoteUrl?: string | null;
  status: "uploading" | "sent" | "failed";
  createdAt: string;
};

export type GlobeChatResourceCompleteMessage = {
  id: string;
  role: "assistant";
  kind: "resource_complete";
  text: string;
  resourceId: string;
  eventId: string;
  productName: string;
  anchorLat: number;
  anchorLng: number;
  visibility: {
    innerGlobe: boolean;
    outerGlobe: boolean;
  };
  createdAt: string;
};

export type GlobeChatSlotPromptMessage = {
  id: string;
  role: "assistant";
  kind: "slot_prompt";
  text: string;
  clarifyKind: ComposeClarifyKind;
  slotId: string;
  choices?: readonly { id: string; labelKo: string }[];
  categoryOptions?: readonly { id: string; labelKo: string }[];
  createdAt: string;
};

export type GlobeChatProgramInstallMessage = {
  id: string;
  role: "assistant";
  kind: "program_install";
  text: string;
  query: string;
  createdAt: string;
};

export type GlobeChatMessage =
  | GlobeChatTextMessage
  | GlobeChatImageMessage
  | GlobeChatResourceCompleteMessage
  | GlobeChatSlotPromptMessage
  | GlobeChatProgramInstallMessage;

export type GlobeChatSession = {
  graphId: string;
  messages: GlobeChatMessage[];
  updatedAt: string;
};
