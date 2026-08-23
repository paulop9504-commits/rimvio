"use client";

import { useCallback } from "react";
import type { CapabilityDispatchRequest } from "@/lib/capability-registry";
import { dispatchCapability } from "@/lib/capability-registry";
import type { ExecutionRecord } from "@/lib/execution/execution-contract";
import { runExecutionJob } from "@/lib/execution";
import { resolveExecutionTier } from "@/lib/execution-tier";

export type CapabilityDispatchOptions = {
  /** Required for tier-3 (commit) capabilities: MESSAGE, CALL, BOOK_*, etc. */
  commitApproved?: boolean;
};

function withTierMetadata(
  request: CapabilityDispatchRequest,
  options?: CapabilityDispatchOptions,
): CapabilityDispatchRequest {
  return {
    ...request,
    metadata: {
      ...request.metadata,
      ...(options?.commitApproved ? { commitApproved: "true" } : {}),
      executionTierRequested: String(resolveExecutionTier(request.capabilityId)),
    },
  };
}

/**
 * UI dispatch — capability id only; execution via Execution Plane.
 */
export function useCapabilityDispatch(handlers?: { sendPrompt?: (text: string) => void }) {
  const dispatch = useCallback(
    (request: CapabilityDispatchRequest, options?: CapabilityDispatchOptions) => {
      const result = dispatchCapability(withTierMetadata(request, options));
      if (result.ok) {
        runExecutionJob(result.executionId, handlers);
      }
      return result;
    },
    [handlers],
  );

  const dispatchAndRecord = useCallback(
    (
      request: CapabilityDispatchRequest,
      options?: CapabilityDispatchOptions,
    ): {
      result: ReturnType<typeof dispatchCapability>;
      record: ExecutionRecord | null;
    } => {
      const result = dispatchCapability(withTierMetadata(request, options));
      if (!result.ok) {
        return { result, record: null };
      }
      const record = runExecutionJob(result.executionId, handlers);
      return { result, record };
    },
    [handlers],
  );

  return { dispatch, dispatchAndRecord };
}
