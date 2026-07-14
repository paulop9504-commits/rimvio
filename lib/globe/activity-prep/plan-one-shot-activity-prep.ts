import {
  isBroadActivityQuery,
  parseActivityFocusDetail,
} from "@/lib/globe/context-condition-ai/resolve-local-discovery-domain";
import type { LocalDiscoveryActivitySubtype } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { isActivityPrepUtterance } from "@/lib/globe/activity-prep/is-activity-prep-utterance";

export type OneShotActivityPrepStep = "parse_activity_intent" | "ready_for_scout";

export type OneShotActivityPrepPlan = {
  readonly message: string;
  readonly activityFocus: string | null;
  readonly activitySubtype: LocalDiscoveryActivitySubtype | null;
  readonly broadQuery: boolean;
  readonly readyForScout: boolean;
  readonly steps: readonly OneShotActivityPrepStep[];
};

/** Pure plan — activity utterance → scout (no slot gaps; clarify stays in Operator). */
export function planOneShotActivityPrep(input: {
  message: string;
}): OneShotActivityPrepPlan | null {
  const message = input.message.trim();
  if (!message || !isActivityPrepUtterance(message)) {
    return null;
  }
  const specific = parseActivityFocusDetail(message);
  return {
    message,
    activityFocus: specific?.focus ?? null,
    activitySubtype: specific?.subtype ?? null,
    broadQuery: isBroadActivityQuery(message),
    readyForScout: true,
    steps: ["parse_activity_intent", "ready_for_scout"],
  };
}
