/**
 * Context NL entry — thin wrapper over the canonical NL Pipeline runner.
 * Priority: Context First → Graph First → Action First → Reason Later.
 */

import type { ContextNlActionResult } from "@/lib/action-planner/context-nl-types";
import { readSessionGraph } from "@/lib/graph-command/session-graph-store";
import {
  runNaturalLanguagePipeline,
  runNaturalLanguagePipelineAsync,
} from "@/lib/context-run/run-natural-language-pipeline";

export type { ContextNlActionResult } from "@/lib/action-planner/context-nl-types";

export function tryRunContextNlAction(input: {
  utterance: string;
  contextEventId: string;
  anchorLat?: number | null;
  anchorLng?: number | null;
  contextLabelKo?: string | null;
}): ContextNlActionResult | null {
  return runNaturalLanguagePipeline(input).result;
}

export async function tryRunContextNlActionAsync(input: {
  utterance: string;
  contextEventId: string;
  anchorLat?: number | null;
  anchorLng?: number | null;
  contextLabelKo?: string | null;
}): Promise<ContextNlActionResult | null> {
  return (await runNaturalLanguagePipelineAsync(input)).result;
}

/** Full pipeline run with stage trace (tests / Field debug). */
export function tryRunContextNlPipeline(input: {
  utterance: string;
  contextEventId: string;
  anchorLat?: number | null;
  anchorLng?: number | null;
  contextLabelKo?: string | null;
}) {
  return runNaturalLanguagePipeline(input);
}

export async function tryRunContextNlPipelineAsync(input: {
  utterance: string;
  contextEventId: string;
  anchorLat?: number | null;
  anchorLng?: number | null;
  contextLabelKo?: string | null;
}) {
  return runNaturalLanguagePipelineAsync(input);
}

export function readContextNlGraph(contextEventId: string) {
  return readSessionGraph(contextEventId);
}
