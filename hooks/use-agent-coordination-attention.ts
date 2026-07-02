"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useCopy } from "@/hooks/use-copy";
import {
  openFieldTradesForCoordination,
  subscribeAgentCoordinationAttention,
} from "@/lib/globe/market/coordination/agent-coordination-attention-bridge";
import { agentNegotiationRoomPath } from "@/lib/globe/market/coordination/agent-negotiation-store";
import { readUserFocusDeferringNegotiationSync } from "@/lib/globe/market/coordination/client/read-user-focus-defer-client";

export function useAgentCoordinationAttention(): void {
  const copy = useCopy();
  const uiRef = useRef(copy.globe.coordination);
  uiRef.current = copy.globe.coordination;

  useEffect(() => {
    const ui = uiRef.current;
    return subscribeAgentCoordinationAttention((event) => {
      if (event.kind === "slot_needed" && readUserFocusDeferringNegotiationSync()) {
        return;
      }
      const openRoom = () => {
        window.location.assign(agentNegotiationRoomPath(event.handshakeId));
      };
      const openTrades = () => {
        openFieldTradesForCoordination(event.handshakeId);
      };

      switch (event.kind) {
        case "slot_needed":
          toast(ui.attentionSlotNeeded(event.productTitle), {
            action: { label: ui.attentionOpenRoom, onClick: openRoom },
          });
          break;
        case "proposal_ready":
          toast(ui.attentionProposalReady(event.productTitle), {
            action: { label: ui.attentionReviewCta, onClick: openTrades },
          });
          break;
        case "peer_approved":
          toast(ui.attentionPeerApproved(event.productTitle), {
            action: { label: ui.attentionReviewCta, onClick: openTrades },
          });
          break;
        case "fully_approved":
          toast.success(ui.attentionFullyApproved(event.productTitle), {
            action: { label: ui.attentionOpenTrades, onClick: openTrades },
          });
          break;
        default:
          break;
      }
    });
  }, []);
}
