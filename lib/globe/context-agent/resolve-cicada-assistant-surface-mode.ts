import type { CicadaAgentPhase } from "@/lib/globe/context-agent/resolve-cicada-agent-phase";

/** Discussion = chat-heavy · globe_primary = Globe canvas focus (IDE tab switch). */
export type CicadaAssistantSurfaceMode = "discussion" | "globe_primary";

export function resolveCicadaAssistantSurfaceMode(input: {
  phase: CicadaAgentPhase;
  pinned: boolean;
}): CicadaAssistantSurfaceMode {
  if (input.pinned) {
    return "globe_primary";
  }
  switch (input.phase) {
    case "clarifying":
    case "searching":
      return "discussion";
    case "visualizing":
      return "globe_primary";
    case "idle":
    default:
      return "discussion";
  }
}
