/** Operator turn gate — @see docs/RIMVIO_OPERATOR_TURN.md */

export {
  OPERATOR_FIXED_TOOLS,
  type OperatorClassifyCategory,
  type OperatorFixedToolId,
  type OperatorTurnPlan,
  type OperatorTurnSsot,
} from "@/lib/globe/operator-turn/types";

export {
  readOperatorTurnSsot,
  reelHasKindSlice,
} from "@/lib/globe/operator-turn/read-operator-turn-ssot";

export {
  gateOperatorTurnSync,
  hasOpenDiscoverySurface,
  isOperatorWhitelistTool,
  mapClassifyToOperatorTool,
} from "@/lib/globe/operator-turn/gate-operator-turn";

export {
  claimOperatorAutoRun,
  requestOperatorAutoRun,
  subscribeOperatorAutoRun,
  wasOperatorAutoRunClaimed,
  type OperatorAutoRunDetail,
} from "@/lib/globe/operator-turn/operator-auto-run-bridge";

export {
  offerScoutFailRecovery,
  maybeOfferRejectRescout,
} from "@/lib/globe/operator-turn/offer-scout-fail-recovery-client";
