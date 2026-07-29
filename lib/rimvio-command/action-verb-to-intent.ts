/**
 * ActionVerb + Target → IntentFamily mapping (ADR-035).
 *
 * Same verb resolves to different IntentFamily depending on where
 * the command targets. e.g. search + new_context → Create,
 * search + current_context → Search, search + current_workspace → Filter.
 */

import type { IntentFamily } from "@/lib/rule-engine/constitution";
import type { ActionVerb } from "@/lib/rimvio-command/action-verb";
import type { CommandTarget } from "@/lib/rimvio-command/resolve-command-target";
import { classifyIntentFamily } from "@/lib/rule-engine/classify-intent-family";

type VerbTargetKey = `${ActionVerb}:${CommandTarget}`;

/**
 * Static overrides where the verb+target combination deterministically
 * maps to a specific IntentFamily without needing utterance analysis.
 */
const STATIC_MAP: Partial<Record<VerbTargetKey, IntentFamily>> = {
  "create:new_context": "Create",
  "create:current_context": "Create",
  "search:new_context": "Create",
  "search:current_workspace": "Filter",
  "book:external_reality": "Reserve",
  "book:current_context": "Reserve",
  "move:current_context": "Move",
  "move:new_context": "Navigate",
  "edit:selected_artifact": "Revise",
  "edit:current_workspace": "Revise",
  "edit:current_context": "Revise",
  "cancel:selected_artifact": "Delete",
  "cancel:current_workspace": "Delete",
  "cancel:current_context": "Delete",
  "memory:current_context": "Pin",
  "memory:current_workspace": "Pin",
  "memory:selected_artifact": "Note",
  "share:current_context": "Share",
  "share:selected_artifact": "Share",
  "decision:current_context": "Compare",
  "decision:current_workspace": "Compare",
  "analyze:current_context": "Analyze",
  "analyze:new_context": "Analyze",
  "analyze:current_workspace": "Analyze",
  "resume:current_context": "Unknown",
  "action:external_reality": "Reserve",
  "prepare:new_context": "Create",
  "prepare:current_context": "Prepare",
  "auto:current_context": "Unknown",
};

/**
 * Resolve IntentFamily from ActionVerb + CommandTarget.
 * Falls back to existing `classifyIntentFamily` when no static override matches.
 */
export function resolveIntentFromActionVerb(
  verb: ActionVerb | null,
  target: CommandTarget,
  utterance: string,
): IntentFamily {
  if (verb) {
    const key: VerbTargetKey = `${verb}:${target}`;
    const mapped = STATIC_MAP[key];
    if (mapped) return mapped;
  }

  return classifyIntentFamily(utterance);
}
