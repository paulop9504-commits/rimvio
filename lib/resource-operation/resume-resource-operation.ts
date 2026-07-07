import { resolveResourceOperationSignal } from "@/lib/resource-operation/resource-operation-signal";
import { readResourceOperation } from "@/lib/resource-operation/resource-operation-store";
import type { ResourceOperationResumeIntent } from "@/lib/resource-operation/types";

export type ResourceOperationResumePlan = {
  resourceId: string;
  contextEventId: string;
  intent: ResourceOperationResumeIntent;
  signalLabel: string | null;
};

export function resolveResourceOperationResume(
  resourceId: string,
): ResourceOperationResumePlan | null {
  const operation = readResourceOperation(resourceId);
  if (!operation) {
    return null;
  }
  const signal = resolveResourceOperationSignal(operation);
  if (operation.stage === "booking" || operation.stage === "awaiting_pay") {
    return {
      resourceId: operation.resourceId,
      contextEventId: operation.contextEventId,
      intent: operation.stage === "awaiting_pay" ? "pay" : "book",
      signalLabel: signal?.label ?? null,
    };
  }
  if (
    operation.stage === "searching" ||
    operation.stage === "comparing" ||
    operation.stage === "selected"
  ) {
    return {
      resourceId: operation.resourceId,
      contextEventId: operation.contextEventId,
      intent: null,
      signalLabel: signal?.label ?? null,
    };
  }
  return null;
}
