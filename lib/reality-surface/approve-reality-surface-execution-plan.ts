/**
 * Approve Execution Plan on Reality Surface — plan gate OR one step Commit.
 */

import {
  commitContextExecutionPlanFromApproval,
  needsContextExecutionPlanApproval,
  needsContextExecutionStepApproval,
  startContextExecutionPlanRuntime,
} from "@/lib/context-execution";
import type { RealitySurfaceSession } from "@/lib/reality-surface/project-globe-ingress";

export function approveRealitySurfaceExecutionPlan(
  session: RealitySurfaceSession,
): RealitySurfaceSession {
  const plan = session.executionPlan;
  if (!plan) {
    return session;
  }

  if (needsContextExecutionPlanApproval(plan)) {
    const executionPlan = startContextExecutionPlanRuntime({ plan });
    return {
      ...session,
      executionPlan,
    };
  }

  if (needsContextExecutionStepApproval(plan)) {
    const executionPlan = commitContextExecutionPlanFromApproval({ plan });
    return {
      ...session,
      executionPlan,
    };
  }

  return session;
}
