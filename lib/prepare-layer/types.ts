/**
 * Reality Prepare Layer — AI prepares Reality actions up to Commit boundary.
 * Executes nothing: no pay · no reservation confirm · no purchase.
 *
 * Lifecycle: Discovered → Candidate → Compared → Prepared → Committed
 * Prepare Object status is always ready_for_commit (waiting before Commit).
 */

export const PREPARE_LIFECYCLE_STAGES = [
  "discovered",
  "candidate",
  "compared",
  "prepared",
  "committed",
] as const;

export type PrepareLifecycleStage = (typeof PREPARE_LIFECYCLE_STAGES)[number];

/** Terminal Prepare status — Commit is a separate Field / Reality Action. */
export const PREPARE_OBJECT_STATUS = "ready_for_commit" as const;
export type PrepareObjectStatus = typeof PREPARE_OBJECT_STATUS;

export const PREPARE_ACTIONS = [
  "reservation_prepare",
  "flight_prepare",
  "purchase_candidate",
  "schedule_prepare",
] as const;

export type PrepareAction = (typeof PREPARE_ACTIONS)[number];

/**
 * Prepare Object — ready for human Commit, never auto-executed.
 */
export type PrepareObject = {
  readonly prepareId: string;
  readonly entityId: string;
  readonly action: PrepareAction;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly status: PrepareObjectStatus;
  /** Lifecycle stage after prepare run — always "prepared" when status is ready_for_commit */
  readonly lifecycle: "prepared";
  readonly workspaceId: string | null;
  readonly titleKo: string;
  readonly summaryKo: string;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
};

export type ReservationPreparePayload = {
  readonly kind: "reservation";
  readonly dates: {
    readonly checkInIso: string | null;
    readonly checkOutIso: string | null;
    readonly labelKo: string | null;
  };
  readonly guests: number;
  readonly price: {
    readonly amountWon: number | null;
    readonly labelKo: string | null;
  };
  readonly options: Readonly<Record<string, unknown>>;
  readonly hotelTitle: string;
};

export type FlightPreparePayload = {
  readonly kind: "flight";
  readonly routeLabelKo: string | null;
  readonly departIso: string | null;
  readonly returnIso: string | null;
  readonly passengers: number;
  readonly priceLabelKo: string | null;
  readonly options: Readonly<Record<string, unknown>>;
};

export type PurchaseCandidatePayload = {
  readonly kind: "purchase_candidate";
  readonly itemTitle: string;
  readonly quantity: number;
  readonly priceLabelKo: string | null;
  readonly options: Readonly<Record<string, unknown>>;
};

export type SchedulePreparePayload = {
  readonly kind: "schedule";
  readonly titleKo: string;
  readonly startIso: string | null;
  readonly endIso: string | null;
  readonly options: Readonly<Record<string, unknown>>;
};

export type PrepareResult =
  | {
      readonly ok: true;
      readonly prepare: PrepareObject;
      readonly summaryKo: string;
      /** Explicit: nothing committed / paid / booked */
      readonly executed: false;
      readonly awaitingCommit: true;
    }
  | {
      readonly ok: false;
      readonly reasonKo: string;
      readonly forbidden: boolean;
      readonly executed: false;
    };
