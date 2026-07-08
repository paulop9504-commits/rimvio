/** Context-aware UI Action Binding — Intent → Confirm → injected CTA (L5 handoff). */

export type ContextActionResourceKind = "lodging" | "eatery";

export type ContextActionIntentKind =
  | "book_lodging"
  | "pay_lodging"
  | "book_eatery"
  | "pay_eatery"
  | "refund";

export type ContextActionIntent = {
  readonly kind: ContextActionIntentKind;
  readonly resourceKind: ContextActionResourceKind;
  readonly confidence: number;
};

export type ContextActionInjectionPhase =
  | "intent_detected"
  | "awaiting_confirm"
  | "injected"
  | "executed"
  | "dismissed";

export type ContextActionInjectionTarget = {
  readonly kind: ContextActionResourceKind;
  readonly placeId: string;
  readonly title: string;
  readonly priceLineKo: string | null;
  readonly addressKo: string | null;
};

export type ContextActionInjectedButton = {
  readonly actionTypeId: string;
  readonly labelKo: string;
  readonly href: string;
  readonly internalRoute: boolean;
};

/** Optional hints for HubActionRecord emit at confirm/execute (Action Log ≠ Injection). */
export type ContextActionCommitHints = {
  readonly resourceId: string;
  readonly slot?: { start: string; end: string };
  readonly guestCount?: number;
  readonly amount?: number;
  readonly currency?: string;
};

/** Injected action surface — button did not exist until intent + confirm. */
export type ContextActionInjection = {
  readonly id: string;
  /** Parent Context (folder) — required for HubActionRecord emit. */
  readonly contextEventId: string;
  readonly phase: ContextActionInjectionPhase;
  readonly intent: ContextActionIntent;
  readonly target: ContextActionInjectionTarget;
  readonly confirmPromptKo: string;
  readonly confirmAcceptLabelKo: string;
  readonly confirmRejectLabelKo: string;
  readonly injectedAction: ContextActionInjectedButton | null;
  readonly commitHints?: ContextActionCommitHints | null;
};
