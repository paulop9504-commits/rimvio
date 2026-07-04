import type { PersonaLearnChoice } from "@/lib/persona/types";

export const BRAIN_QUESTION_MEMORY_STORAGE_KEY =
  "rimvio.brain-question-memory.v1" as const;
export const BRAIN_QUESTION_MEMORY_UPDATED =
  "rimvio-brain-question-memory-updated" as const;

export const BRAIN_QUESTION_FAMILIES = [
  "travel",
  "caregiving",
  "business",
  "generic",
] as const;

export type BrainQuestionFamily = (typeof BRAIN_QUESTION_FAMILIES)[number];

export type BrainQuestionMemoryAnswer<SlotId extends string = string> = {
  slotId: SlotId;
  value: string;
  labelKo: string;
  updatedAt: string;
};

type BrainQuestionMemoryFamilySnapshot = {
  updatedAt: string;
  answers: Record<string, BrainQuestionMemoryAnswer>;
};

type BrainQuestionMemorySnapshot = {
  version: 1;
  families: Partial<Record<BrainQuestionFamily, BrainQuestionMemoryFamilySnapshot>>;
};

let memorySnapshot: BrainQuestionMemorySnapshot = {
  version: 1,
  families: {},
};

function emptySnapshot(): BrainQuestionMemorySnapshot {
  return {
    version: 1,
    families: {},
  };
}

function readSnapshot(): BrainQuestionMemorySnapshot {
  if (typeof window === "undefined") {
    return memorySnapshot;
  }
  try {
    const raw = window.localStorage.getItem(BRAIN_QUESTION_MEMORY_STORAGE_KEY);
    if (!raw) {
      return emptySnapshot();
    }
    const parsed = JSON.parse(raw) as BrainQuestionMemorySnapshot;
    if (parsed?.version !== 1 || typeof parsed.families !== "object" || !parsed.families) {
      return emptySnapshot();
    }
    return {
      version: 1,
      families: parsed.families,
    };
  } catch {
    return emptySnapshot();
  }
}

function writeSnapshot(snapshot: BrainQuestionMemorySnapshot): void {
  if (typeof window === "undefined") {
    memorySnapshot = snapshot;
    return;
  }
  try {
    window.localStorage.setItem(
      BRAIN_QUESTION_MEMORY_STORAGE_KEY,
      JSON.stringify(snapshot),
    );
    window.dispatchEvent(new CustomEvent(BRAIN_QUESTION_MEMORY_UPDATED));
  } catch {
    // ignore quota/private mode failures
  }
}

export function listBrainQuestionFamilyAnswers(
  family: BrainQuestionFamily,
): BrainQuestionMemoryAnswer[] {
  const answers = Object.values(readSnapshot().families[family]?.answers ?? {});
  return answers.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function findBrainQuestionFamilyAnswer<SlotId extends string>(
  family: BrainQuestionFamily,
  slotId: SlotId,
): BrainQuestionMemoryAnswer<SlotId> | null {
  const record = readSnapshot().families[family]?.answers?.[slotId];
  if (!record) {
    return null;
  }
  return record as BrainQuestionMemoryAnswer<SlotId>;
}

export function recordBrainQuestionFamilyAnswer<SlotId extends string>(input: {
  family: BrainQuestionFamily;
  slotId: SlotId;
  choice: PersonaLearnChoice;
  updatedAt?: string;
}): BrainQuestionMemoryAnswer<SlotId> {
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  const nextAnswer: BrainQuestionMemoryAnswer<SlotId> = {
    slotId: input.slotId,
    value: input.choice.value,
    labelKo: input.choice.labelKo,
    updatedAt,
  };
  const snapshot = readSnapshot();
  const currentFamily = snapshot.families[input.family];
  writeSnapshot({
    version: 1,
    families: {
      ...snapshot.families,
      [input.family]: {
        updatedAt,
        answers: {
          ...(currentFamily?.answers ?? {}),
          [input.slotId]: nextAnswer,
        },
      },
    },
  });
  return nextAnswer;
}

export function resetBrainQuestionMemoryForTests(): void {
  memorySnapshot = emptySnapshot();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(BRAIN_QUESTION_MEMORY_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(BRAIN_QUESTION_MEMORY_UPDATED));
  }
}
