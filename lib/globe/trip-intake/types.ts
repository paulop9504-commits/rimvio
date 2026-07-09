export type TripBudgetBand = "value" | "balanced" | "premium";

export type TripIntakeState = {
  readonly destinationLabel: string | null;
  readonly originLabel: string | null;
  readonly checkInIso: string | null;
  readonly checkOutIso: string | null;
  readonly guestCount: number | null;
  readonly budgetBand: TripBudgetBand | null;
};

export type TripIntakeGapId =
  | "destination"
  | "origin"
  | "dates"
  | "guests"
  | "budget";

export type TripIntakeWriteInput = {
  readonly contextEventId: string;
  readonly destinationLabel: string;
  readonly originLabel: string;
  readonly checkInIso: string;
  readonly checkOutIso: string;
  readonly guestCount: number;
  readonly budgetBand: TripBudgetBand;
};
