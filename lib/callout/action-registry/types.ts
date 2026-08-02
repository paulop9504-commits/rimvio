/**
 * Callout Action Registry — buttons come from registry, never hard-coded UI.
 */

import type { CalloutHandlers, RimvioObject, RimvioObjectType } from "@/lib/callout/types";

export type CalloutRegistryActionId =
  | "compare"
  | "change"
  | "prepare_booking"
  | "reserve"
  | "add_to_day"
  | "navigate";

export type CalloutActionContext = {
  readonly objectId: string;
  readonly objectType: RimvioObjectType;
  readonly contextId: string;
  readonly object: RimvioObject;
  readonly handlers: CalloutHandlers;
};

export type RegisterCalloutActionInput = {
  readonly objectType: RimvioObjectType | "*";
  readonly action: CalloutRegistryActionId | (string & {});
  readonly labelKo: string;
  /** Visual primary CTA */
  readonly primary?: boolean;
  readonly order?: number;
  readonly isEnabled?: (object: RimvioObject) => boolean;
  readonly handler: (ctx: CalloutActionContext) => void | Promise<void>;
};

export type RegisteredCalloutAction = RegisterCalloutActionInput & {
  readonly id: string;
};

/** Resolved button model for Callout UI — built only from registry. */
export type CalloutActionButton = {
  readonly id: string;
  readonly action: string;
  readonly labelKo: string;
  readonly enabled: boolean;
  readonly primary: boolean;
  readonly objectType: RimvioObjectType | "*";
};
