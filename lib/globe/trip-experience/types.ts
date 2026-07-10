export type TripFunAxis =
  | "food_market"
  | "nature"
  | "festival"
  | "culture"
  | "open";

export type TripDestinationScope =
  | "domestic_near"
  | "domestic_far"
  | "abroad"
  | "open";

export type TripExperienceState = {
  readonly funAxis: TripFunAxis | null;
  readonly destinationScope: TripDestinationScope | null;
  readonly destinationLabel: string | null;
  readonly checkInIso: string | null;
  readonly checkOutIso: string | null;
  readonly guestCount: number | null;
  readonly budgetBand: "value" | "balanced" | "premium" | null;
};

export type TripExperienceGapId =
  | "fun_axis"
  | "destination_scope"
  | "dates"
  | "guests"
  | "budget";
