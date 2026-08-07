/**
 * Agent Execution Feed — append-only timeline (Cursor-style).
 * Short English verbs only. No progress %, no metrics, no mutability of past rows.
 */

import type {
  AgentActivityEvent,
  AgentActivityTranscript,
} from "@/lib/context-run/agent-activity-transcript";
import type { AgentProductPipelineStage } from "@/lib/context-run/agent-product-pipeline";

export type AgentExecutionFeedRowStatus = "done" | "running" | "error";

export type AgentExecutionFeedRow = {
  readonly id: string;
  readonly status: AgentExecutionFeedRowStatus;
  /** Short English action line, e.g. "Searching places..." */
  readonly label: string;
};

export type AgentExecutionFeedView = {
  readonly running: boolean;
  readonly utterance: string;
  readonly rows: readonly AgentExecutionFeedRow[];
};

const STAGE_LINE: Record<AgentProductPipelineStage, string> = {
  intent: "Understanding intent...",
  context_resolution: "Reading context...",
  planner: "Planning search...",
  object_discovery: "Searching places...",
  object_enrichment: "Enriching places...",
  candidate_evaluation: "Ranking candidates...",
  workspace_patch: "Updating workspace...",
  projection: "Creating map objects...",
  agent_status: "Finalizing...",
  prepare: "Preparing...",
  commit: "Waiting approval...",
};

const KIND_LINE: Record<AgentActivityEvent["kind"], string> = {
  thought: "Planning...",
  explore: "Searching places...",
  tool: "Running tool...",
  patch: "Applying changes...",
  verify: "Verifying...",
  status: "Updating...",
};

/** Collapse long KO status essays into 2–4 word EN action lines. */
function shortEnglishLine(ev: AgentActivityEvent): string {
  if (ev.stage && STAGE_LINE[ev.stage]) {
    return STAGE_LINE[ev.stage];
  }
  const raw = ev.labelKo.trim();
  if (/intent|의도|이해/iu.test(raw)) return "Understanding intent...";
  if (/계획|planner|planning/iu.test(raw)) return "Planning search...";
  if (/검색|후보|discover|search|explore|탐색/iu.test(raw)) {
    return "Searching places...";
  }
  if (/평가|rank|compare|비교/iu.test(raw)) return "Ranking candidates...";
  if (/enrich|연결|정보/iu.test(raw)) return "Reading context...";
  if (/patch|반영|workspace/iu.test(raw)) return "Updating workspace...";
  if (/map|핀|projection|화면/iu.test(raw)) return "Creating map objects...";
  if (/준비|prepare/iu.test(raw)) return "Preparing workspace...";
  if (/완료|done|ready|반영했/iu.test(raw)) return "Done.";
  if (/hotel|숙소|lodging/iu.test(raw)) return "Searching hotels...";
  if (/review|리뷰/iu.test(raw)) return "Reading reviews...";
  if (/route|동선|일정/iu.test(raw)) return "Creating itinerary...";
  // Never dump long essay — fall back to kind.
  if (raw.length <= 28 && /^[A-Za-z]/.test(raw)) {
    return raw.endsWith("...") || raw.endsWith(".") ? raw : `${raw}...`;
  }
  return KIND_LINE[ev.kind] ?? "Working...";
}

export function buildAgentExecutionFeedView(
  tape: AgentActivityTranscript | null,
  _progressPercent?: number | null,
): AgentExecutionFeedView | null {
  if (!tape || tape.events.length === 0) return null;

  // Dedupe identical short lines (Cursor ticker shows each verb once).
  const rows: AgentExecutionFeedRow[] = [];
  const seenLabels = new Set<string>();
  for (let index = 0; index < tape.events.length; index += 1) {
    const ev = tape.events[index]!;
    const label = shortEnglishLine(ev);
    if (seenLabels.has(label)) continue;
    seenLabels.add(label);
    rows.push({
      id: ev.id,
      status: "done",
      label,
    });
  }

  if (rows.length === 0) return null;

  if (tape.running) {
    const last = rows[rows.length - 1]!;
    rows[rows.length - 1] = { ...last, status: "running" };
  } else {
    const last = rows[rows.length - 1]!;
    if (last.label !== "Done.") {
      rows.push({
        id: `${last.id}_done`,
        status: "done",
        label: "Done.",
      });
    }
  }

  return {
    running: tape.running,
    utterance: tape.utterance,
    rows,
  };
}
