/**
 * Personal slang memory (Feedback Loop, Stage 3).
 *
 * When the assistant meets an opaque neologism it asks what it means; the user's
 * answer is stored here as {key, value, context}. Next time that term shows up we
 * reuse the stored meaning instead of asking again. Persisted to localStorage so
 * it survives reloads, with an in-memory fallback for SSR/tests.
 *
 * `pendingLearn` tracks, per surface scope, the term we just asked about so the
 * next chat turn can be captured as its definition.
 */

export type SlangMemoryEntry = {
  readonly key: string;
  readonly value: string;
  readonly contextKo: string;
  readonly atIso: string;
};

const STORAGE_KEY = "rimvio-slang-memory";

const memory = new Map<string, SlangMemoryEntry>();
const pendingLearn = new Map<string, string>();
let hydrated = false;

function normalize(term: string): string {
  return term.trim().toLowerCase();
}

function hydrate(): void {
  if (hydrated || typeof window === "undefined") {
    return;
  }
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const row of parsed) {
        if (
          row &&
          typeof row.key === "string" &&
          typeof row.value === "string"
        ) {
          memory.set(normalize(row.key), {
            key: row.key,
            value: row.value,
            contextKo: typeof row.contextKo === "string" ? row.contextKo : "",
            atIso: typeof row.atIso === "string" ? row.atIso : new Date().toISOString(),
          });
        }
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
}

function persist(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(memory.values())),
    );
  } catch {
    /* storage full / unavailable — keep in-memory only */
  }
}

export function rememberSlang(input: {
  key: string;
  value: string;
  contextKo?: string;
}): SlangMemoryEntry {
  hydrate();
  const entry: SlangMemoryEntry = {
    key: input.key.trim(),
    value: input.value.trim(),
    contextKo: input.contextKo?.trim() ?? "",
    atIso: new Date().toISOString(),
  };
  memory.set(normalize(entry.key), entry);
  persist();
  return entry;
}

/** Return the stored meaning for any known slang term found inside the text. */
export function lookupSlangInText(text: string): SlangMemoryEntry | null {
  hydrate();
  const lower = text.toLowerCase();
  let best: SlangMemoryEntry | null = null;
  for (const entry of memory.values()) {
    const key = normalize(entry.key);
    if (key && lower.includes(key)) {
      if (!best || key.length > normalize(best.key).length) {
        best = entry;
      }
    }
  }
  return best;
}

export function readAllSlangMemory(): readonly SlangMemoryEntry[] {
  hydrate();
  return Array.from(memory.values());
}

export function setPendingSlangLearn(scopeId: string, term: string): void {
  const id = scopeId.trim();
  const t = term.trim();
  if (!id || !t) {
    return;
  }
  pendingLearn.set(id, t);
}

export function readPendingSlangLearn(scopeId: string): string | null {
  return pendingLearn.get(scopeId.trim()) ?? null;
}

export function clearPendingSlangLearn(scopeId: string): void {
  pendingLearn.delete(scopeId.trim());
}

export function resetSlangMemoryForTests(): void {
  memory.clear();
  pendingLearn.clear();
  hydrated = false;
}
