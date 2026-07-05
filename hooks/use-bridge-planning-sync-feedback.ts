"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import {
  BRIDGE_PLANNING_SYNC_FEEDBACK,
  type BridgePlanningSyncFeedback,
} from "@/lib/bridge-planning/planning-sync-feedback";
import { copy } from "@/lib/copy/human-ko";

function showBridgePlanningSyncFeedback(feedback: BridgePlanningSyncFeedback): void {
  switch (feedback.kind) {
    case "proposal_accepted":
      toast.success(
        copy.globe.bridgePlanningProposalAcceptedMember(feedback.destinationLabel),
      );
      break;
    case "proposal_rejected":
      toast.message(
        copy.globe.bridgePlanningProposalRejectedMember(feedback.destinationLabel),
      );
      break;
    case "proposal_updated":
      toast.message(
        copy.globe.bridgePlanningProposalUpdated(feedback.destinationLabel),
      );
      break;
    case "host_committed":
      toast.success(
        copy.globe.bridgePlanningHostCommittedMember(feedback.destinationLabel),
      );
      break;
    default:
      break;
  }
}

/** Member-facing toasts when bridge sync resolves a pending planning proposal. */
export function useBridgePlanningSyncFeedback(enabled = true): void {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }
    const onFeedback = (event: Event) => {
      const detail = (event as CustomEvent<BridgePlanningSyncFeedback>).detail;
      if (!detail?.kind) {
        return;
      }
      showBridgePlanningSyncFeedback(detail);
    };
    window.addEventListener(BRIDGE_PLANNING_SYNC_FEEDBACK, onFeedback);
    return () => {
      window.removeEventListener(BRIDGE_PLANNING_SYNC_FEEDBACK, onFeedback);
    };
  }, [enabled]);
}
