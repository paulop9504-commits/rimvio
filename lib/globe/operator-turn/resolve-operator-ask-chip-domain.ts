import { isFinancePrepUtterance } from "@/lib/globe/finance-prep/is-finance-prep-utterance";
import { isFlightPrepUtterance } from "@/lib/globe/flight-prep/is-flight-prep-utterance";
import { isTransitPrepUtterance } from "@/lib/globe/transit-prep/is-transit-prep-utterance";

export type OperatorAskChipDomain =
  | "trip_intake"
  | "trip_experience"
  | "flight_prep"
  | "transit_prep"
  | "finance_prep"
  | "lodging_stay_revise"
  | "soft_graph_confirm"
  | "clarify_less"
  | "plan_handoff"
  | "ingress_converge";

export function resolveOperatorAskChipDomain(input: {
  pendingTrigger: string;
  planReason:
    | "trip_intake_gap"
    | "trip_experience_gap"
    | "transit_prep_gap"
    | "finance_prep_gap"
    | "lodging_stay_revise"
    | "soft_graph_confirm"
    | "convergence_or_clarify";
}): OperatorAskChipDomain {
  if (input.planReason === "lodging_stay_revise") {
    return "lodging_stay_revise";
  }
  if (input.planReason === "soft_graph_confirm") {
    return "soft_graph_confirm";
  }
  if (input.planReason === "trip_experience_gap") {
    return "trip_experience";
  }
  if (input.planReason === "transit_prep_gap") {
    return "transit_prep";
  }
  if (input.planReason === "finance_prep_gap") {
    return "finance_prep";
  }
  if (isFlightPrepUtterance(input.pendingTrigger)) {
    return "flight_prep";
  }
  if (isTransitPrepUtterance(input.pendingTrigger)) {
    return "transit_prep";
  }
  if (isFinancePrepUtterance(input.pendingTrigger)) {
    return "finance_prep";
  }
  return "trip_intake";
}
