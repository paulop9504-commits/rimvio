/**
 * Action First utterance gate — never Continue-scout these turns.
 * Search stays on discovery scout unless a non-search Graph Command matches.
 */

import { isContextActionIntentMessage } from "@/lib/globe/context-action-injection/resolve-context-action-intent";
import {
  isGraphCommandUtterance,
  parseGraphCommands,
} from "@/lib/graph-command/parse-graph-commands";
import type { SessionGraphV1 } from "@/lib/graph-command/types";
import {
  classifyIntentFamily,
} from "@/lib/rule-engine/classify-intent-family";
import type { IntentFamily } from "@/lib/rule-engine/constitution";

/** Intents that must edit graph / open tools — never 「조건 다듬기」. */
export const ACTION_FIRST_INTENTS: ReadonlySet<IntentFamily> = new Set([
  "Pin",
  "Delete",
  "Compare",
  "Filter",
  "Reserve",
  "Purchase",
  "Group",
  "Ungroup",
  "Move",
  "Revise",
  "Note",
  "Highlight",
  "Share",
  "Simulate",
  "Navigate",
  "Calendar",
  "Create",
]);

export function isActionFirstUtterance(
  utterance: string,
  graph?: SessionGraphV1 | null,
): boolean {
  const text = utterance.trim();
  if (!text) {
    return false;
  }
  if (isContextActionIntentMessage(text)) {
    return true;
  }
  const intent = classifyIntentFamily(text);
  if (ACTION_FIRST_INTENTS.has(intent)) {
    return true;
  }
  const commands = parseGraphCommands(text, graph ?? null);
  if (commands.length > 0 && commands[0]?.op !== "search_project") {
    return true;
  }
  // Explicit graph mutation even if classifier said Search (e.g. 「필터」 alone).
  if (isGraphCommandUtterance(text, graph ?? null)) {
    const op = parseGraphCommands(text, graph ?? null)[0]?.op;
    return op != null && op !== "search_project";
  }
  return false;
}
