import { isBridgeContextThreadId } from "@/lib/peer-chat/bridge-context-thread";

export type PeerChatLane = "all" | "friend" | "group" | "context" | "alignment" | "ai";

export type PeerThreadLaneKind = "friend" | "group" | "context" | "alignment";

export function resolvePeerThreadLaneKind(input: {
  threadId: string;
  isGroup?: boolean;
  alignmentThreadIds?: ReadonlySet<string>;
  hasContextLink?: boolean;
}): PeerThreadLaneKind {
  if (input.isGroup) {
    return "group";
  }
  if (input.alignmentThreadIds?.has(input.threadId)) {
    return "alignment";
  }
  if (isBridgeContextThreadId(input.threadId) || input.hasContextLink) {
    return "context";
  }
  return "friend";
}

export function peerThreadMatchesLane(
  lane: PeerChatLane,
  kind: PeerThreadLaneKind,
): boolean {
  if (lane === "ai") {
    return false;
  }
  if (lane === "all") {
    return true;
  }
  return lane === kind;
}
