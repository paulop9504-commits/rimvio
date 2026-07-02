"use client";

import { useAgentCoordinationAttention } from "@/hooks/use-agent-coordination-attention";
import { useAgentCoordinationFocusSync } from "@/hooks/use-agent-coordination-focus-sync";

/** Global toast bridge for agent coordination attention events. */
export function AgentCoordinationAttentionMount() {
  useAgentCoordinationAttention();
  useAgentCoordinationFocusSync();
  return null;
}
