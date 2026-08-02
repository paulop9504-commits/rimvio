/**
 * Callout Prepare — ReservationDraft (Prepared State only).
 * Never Reality Commit.
 */

export type ReservationDateRange = {
  readonly checkInIso: string | null;
  readonly checkOutIso: string | null;
  readonly labelKo: string | null;
};

export type ReservationPrice = {
  readonly amountWon: number | null;
  readonly labelKo: string | null;
};

/**
 * Hotel / place reservation preparation draft.
 * status is always "draft" on this path — Commit is a separate Reality Action.
 */
export type ReservationDraft = {
  readonly draftId: string;
  readonly objectId: string;
  readonly contextId: string;
  readonly title: string;
  readonly dateRange: ReservationDateRange;
  readonly guestCount: number;
  readonly price: ReservationPrice;
  readonly status: "draft";
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
};

export type PrepareChecklistId =
  | "info"
  | "candidate"
  | "conditions";

export type PrepareChecklistStep = {
  readonly id: PrepareChecklistId;
  readonly labelKo: string;
  readonly done: boolean;
  readonly detailKo: string | null;
};

export type PrepareViewModel = {
  readonly titleKo: string;
  readonly steps: readonly PrepareChecklistStep[];
  readonly draft: ReservationDraft | null;
  readonly canCreateDraft: boolean;
  readonly ctaKo: string;
  readonly commitHintKo: string;
};
