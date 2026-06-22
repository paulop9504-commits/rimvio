import type {
  ExperienceBehaviorKind,
  ExperienceBehaviorRecord,
} from "@/lib/meaning/experience-behavior-types";
import { EXPERIENCE_BEHAVIOR_WEIGHTS } from "@/lib/meaning/experience-behavior-types";

const STORAGE_KEY = "rimvio-experience-behavior-v1";
const MAX_ROWS = 400;

function readRows(): ExperienceBehaviorRecord[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (row): row is ExperienceBehaviorRecord =>
        typeof row === "object" &&
        row !== null &&
        typeof (row as ExperienceBehaviorRecord).eventId === "string" &&
        typeof (row as ExperienceBehaviorRecord).kind === "string" &&
        typeof (row as ExperienceBehaviorRecord).atIso === "string",
    );
  } catch {
    return [];
  }
}

function writeRows(rows: ExperienceBehaviorRecord[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(-MAX_ROWS)));
}

export function listExperienceBehaviorRecords(): ExperienceBehaviorRecord[] {
  return readRows();
}

export function appendExperienceBehaviorRecord(input: {
  eventId: string;
  kind: ExperienceBehaviorKind;
  atIso?: string;
}): void {
  const eventId = input.eventId.trim();
  if (!eventId) {
    return;
  }
  const rows = readRows();
  rows.push({
    eventId,
    kind: input.kind,
    atIso: input.atIso?.trim() || new Date().toISOString(),
  });
  writeRows(rows);
}

export function readExperienceBehaviorScore(eventId: string): number {
  const id = eventId.trim();
  if (!id) {
    return 0;
  }
  let score = 0;
  for (const row of readRows()) {
    if (row.eventId !== id) {
      continue;
    }
    score += EXPERIENCE_BEHAVIOR_WEIGHTS[row.kind] ?? 0;
  }
  return Math.max(0, Math.min(100, score));
}

/** Test-only reset. */
export function clearExperienceBehaviorStoreForTests(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}
