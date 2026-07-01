import type { ComposeSchemaId } from "@/lib/portal/compose-draft/types";

export type ComposeIntentStage = "chatting" | "soft_signal" | "confirmed";

export type IntentState =
  | { stage: "chatting" }
  | { stage: "soft_signal"; possibleIntent: ComposeSchemaId }
  | { stage: "confirmed"; resourceType: ComposeSchemaId };

export type ComposeIntentMessage = {
  role: "user" | "assistant";
  text: string;
};
