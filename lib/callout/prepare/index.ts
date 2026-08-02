/**
 * Callout Prepare Mode — ReservationDraft (never Commit).
 */

export type {
  PrepareChecklistId,
  PrepareChecklistStep,
  PrepareViewModel,
  ReservationDateRange,
  ReservationDraft,
  ReservationPrice,
} from "@/lib/callout/prepare/types";

export {
  assertPrepareDoesNotCommit,
  buildPrepareChecklist,
  createReservationDraft,
  reservationDraftSummaryKo,
} from "@/lib/callout/prepare/create-reservation-draft";

export {
  clearReservationDraft,
  readReservationDraft,
  RESERVATION_DRAFT_UPDATED,
  writeReservationDraft,
} from "@/lib/callout/prepare/reservation-draft-store";

export {
  buildReservationDateRangeFromWorkspace,
  buildReservationPriceFromObject,
  defaultGuestCountFromWorkspace,
} from "@/lib/callout/prepare/from-workspace";
