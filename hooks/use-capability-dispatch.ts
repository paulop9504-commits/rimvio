"use client";

import { useCallback } from "react";
import type { CapabilityDispatchRequest } from "@/lib/capability-registry";
import { dispatchCapability } from "@/lib/capability-registry";
import { runExecutionJob } from "@/lib/execution";

/**
 * UI dispatch — capability id only; execution via Execution Plane.
 */
export function useCapabilityDispatch(handlers?: { sendPrompt?: (text: string) => void }) {
  const dispatch = useCallback(
    (request: CapabilityDispatchRequest) => {
      const result = dispatchCapability(request);
      if (result.ok) {
        runExecutionJob(result.executionId, handlers);
      }
      return result;
    },
    [handlers],
  );

  return { dispatch };
}
