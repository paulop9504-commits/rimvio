/**
 * Rimvio Reality Prepare Layer
 *
 * AI prepares Reality actions up to ready_for_commit — never executes.
 * Lifecycle: Discovered → Candidate → Compared → Prepared → Committed
 */

export type {
  FlightPreparePayload,
  PrepareAction,
  PrepareLifecycleStage,
  PrepareObject,
  PrepareObjectStatus,
  PrepareResult,
  PurchaseCandidatePayload,
  ReservationPreparePayload,
  SchedulePreparePayload,
} from "@/lib/prepare-layer/types";

export {
  PREPARE_ACTIONS,
  PREPARE_LIFECYCLE_STAGES,
  PREPARE_OBJECT_STATUS,
} from "@/lib/prepare-layer/types";

export {
  buildFlightPreparePayload,
  buildPurchaseCandidatePayload,
  buildReservationPreparePayload,
  buildSchedulePreparePayload,
  resolvePrepareAction,
  summarizePreparePayload,
} from "@/lib/prepare-layer/draft-actions";

export {
  assertPrepareDoesNotExecute,
  isAllowedPrepareAction,
  isPrepareExecutionForbidden,
  looksLikeForbiddenPrepareUtterance,
  validatePrepareDraft,
} from "@/lib/prepare-layer/prepare-validator";

export {
  clearPreparesForTests,
  listPrepares,
  nextPrepareLifecycle,
  prepareHotelReservation,
  PREPARE_UPDATED,
  readLatestPrepare,
  readPrepareObject,
  runRealityPrepare,
  savePrepareObject,
} from "@/lib/prepare-layer/prepare";

export {
  formatPrepareReadyUxKo,
  prepareResultToUxKo,
  prepareSurfaceForbidsCommitCta,
  PREPARE_READY_TITLE_KO,
  PREPARE_REVIEW_CTA_KO,
} from "@/lib/prepare-layer/ux";
