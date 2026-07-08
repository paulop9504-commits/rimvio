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
  isOperatorWhitelistTool,
  mapClassifyToOperatorTool,
} from "@/lib/globe/operator-turn/gate-operator-turn";
