import { listEventCandidates } from "@/lib/events/event-store";
import {
  rankEventOpportunities,
  type OpportunityScoreBreakdown,
  evaluateEventOpportunities,
} from "@/lib/opportunity-engine/score-event-opportunity";
import type {
  EventOpportunitySignal,
  OpportunityEngineContext,
} from "@/lib/opportunity-engine/types";

export type {
  EventOpportunityPriority,
  EventOpportunitySignal,
  OpportunityEngineContext,
} from "@/lib/opportunity-engine/types";

export {
  evaluateEventOpportunities,
  rankEventOpportunities,
  scoreEventOpportunity,
  toOpportunitySignal,
  type OpportunityScoreBreakdown,
} from "@/lib/opportunity-engine/score-event-opportunity";

/**
 * Read-only entry — scores existing EventCandidates from store.
 * Does NOT create, mutate, or infer events.
 */
export function listRankedEventOpportunities(
  context: OpportunityEngineContext = {}
): EventOpportunitySignal[] {
  return rankEventOpportunities(listEventCandidates(), context);
}

/** Detailed breakdown for inspection / tests. */
export function listEvaluatedEventOpportunities(
  context: OpportunityEngineContext = {}
): OpportunityScoreBreakdown[] {
  return evaluateEventOpportunities(listEventCandidates(), context);
}
