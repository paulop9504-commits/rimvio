import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";

const MAX_CLOSURE_LINE_LENGTH = 72;

function trimClosureLine(value: string | null | undefined): string | null {
  const trimmed = value?.trim().replace(/\s+/gu, " ") ?? "";
  if (!trimmed) {
    return null;
  }
  if (trimmed.length <= MAX_CLOSURE_LINE_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_CLOSURE_LINE_LENGTH - 1).trimEnd()}…`;
}

/** Floor 2 — one-line “why here” without LLM wall. */
export function resolveBrainSurfaceClosureLine(
  candidate: BrainSurfaceProjectionCandidate,
): string | null {
  const title = candidate.label.trim();
  const candidates = [
    candidate.relationMemoKo,
    candidate.inferenceLabelKo,
    candidate.previewBody,
    candidate.sourceLabelKo,
  ];

  for (const row of candidates) {
    const line = trimClosureLine(row);
    if (!line || line === title) {
      continue;
    }
    if (title && line.includes(title) && line.length > title.length + 8) {
      return line;
    }
    if (!title || !line.includes(title)) {
      return line;
    }
  }

  return null;
}
