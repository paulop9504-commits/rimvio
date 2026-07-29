/**
 * Agent message bus — inter-agent communication channel.
 */

import type { AgentMessage } from "@/lib/agent-orchestrator/types";

type MessageHandler = (msg: AgentMessage) => void;

const subscribers = new Map<string, MessageHandler[]>();
const messageLog: AgentMessage[] = [];

export function sendAgentMessage(msg: AgentMessage): void {
  messageLog.push(msg);
  const handlers = subscribers.get(msg.to) ?? [];
  for (const h of handlers) {
    h(msg);
  }
}

export function subscribeAgentMessages(
  agentId: string,
  handler: MessageHandler,
): () => void {
  const existing = subscribers.get(agentId) ?? [];
  existing.push(handler);
  subscribers.set(agentId, existing);
  return () => {
    const list = subscribers.get(agentId);
    if (list) {
      const idx = list.indexOf(handler);
      if (idx >= 0) list.splice(idx, 1);
    }
  };
}

export function getMessageLog(): readonly AgentMessage[] {
  return messageLog;
}

export function clearMessageLog(): void {
  messageLog.length = 0;
}
