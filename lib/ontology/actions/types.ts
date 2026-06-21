import type { ContextHubServiceId } from "@/lib/globe/context-hub/context-hub-service-catalog";
import type { ActionCategory } from "@/lib/semantic/types";

export type RimvioActionFamily = "mention" | "hub";

/** Unified executable action type — @ registry + context hub connect. */
export type RimvioActionType = {
  actionTypeId: string;
  family: RimvioActionFamily;
  labelKo: string;
  actionCategory: ActionCategory;
  /** Chat contract id when family=mention. */
  contractAction?: string;
  /** Mention feature id when family=mention. */
  featureId?: string;
  /** Hub service when family=hub. */
  hubServiceId?: ContextHubServiceId;
  requiredSlots: readonly string[];
  /** MAIN / hub rail rank boost baseline. */
  rankWeight: number;
};

export type RimvioActionTypeId = RimvioActionType["actionTypeId"];
