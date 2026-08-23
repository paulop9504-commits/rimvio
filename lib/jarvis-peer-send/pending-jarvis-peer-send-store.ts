import type { InlineChatPeerSendWire } from "@/lib/jarvis-peer-send/inline-chat-peer-send";

export type PendingJarvisPeerSend = {
  readonly messageId: string;
  readonly wire: InlineChatPeerSendWire;
};

let pending: PendingJarvisPeerSend | null = null;

export function setPendingJarvisPeerSend(next: PendingJarvisPeerSend | null): void {
  pending = next;
}

export function readPendingJarvisPeerSend(): PendingJarvisPeerSend | null {
  return pending;
}

export function clearPendingJarvisPeerSend(): void {
  pending = null;
}
