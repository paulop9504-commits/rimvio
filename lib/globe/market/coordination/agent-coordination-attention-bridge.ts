import { openFieldTradesIngress } from "@/lib/nav/field-dashboard-ingress";

export type AgentCoordinationAttentionKind =
  | "slot_needed"
  | "proposal_ready"
  | "peer_approved"
  | "fully_approved";

export type AgentCoordinationAttentionEvent = {
  handshakeId: string;
  productTitle: string;
  kind: AgentCoordinationAttentionKind;
};

const listeners = new Set<(event: AgentCoordinationAttentionEvent) => void>();

export function dispatchAgentCoordinationAttention(
  event: AgentCoordinationAttentionEvent,
): void {
  for (const listener of listeners) {
    listener(event);
  }
}

export function subscribeAgentCoordinationAttention(
  listener: (event: AgentCoordinationAttentionEvent) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function openFieldTradesForCoordination(handshakeId: string): void {
  openFieldTradesIngress(handshakeId);
}
