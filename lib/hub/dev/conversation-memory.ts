/**
 * Operator conversation memory — 그거/여기, implicit intent, mid-work goal change.
 * Session-scoped; never a second Agent Runtime.
 */

export type OperatorMemoryFocus = {
  readonly kind: "file" | "capability" | "symbol" | "task" | "object";
  readonly id: string;
  readonly label: string;
};

export type OperatorConversationMemory = {
  readonly platformId: string;
  readonly currentGoal: string | null;
  readonly currentTask: string | null;
  readonly lastUtterance: string | null;
  readonly lastFiles: readonly string[];
  readonly lastCapabilities: readonly string[];
  readonly lastSymbols: readonly string[];
  readonly lastObjects: readonly string[];
  readonly history: readonly string[];
  readonly workInProgress: boolean;
  readonly latestTask?: string | null;
  readonly latestResult?: "success" | "partial" | "failed" | null;
  readonly latestChangedCapabilities?: readonly string[];
  readonly latestVerification?: "passed" | "failed" | "skipped" | null;
};

export type ReferenceResolution = {
  readonly hadReference: boolean;
  readonly expandedUtterance: string;
  readonly substitutions: readonly { readonly from: string; readonly to: string }[];
  readonly focus: OperatorMemoryFocus | null;
};

export type ImplicitIntentResult = {
  readonly inferred: boolean;
  readonly expandedUtterance: string;
  readonly reason: string;
};

export type GoalChangeResult = {
  readonly changed: boolean;
  readonly previousGoal: string | null;
  readonly nextGoal: string;
  readonly reasonKo: string | null;
};

const MEMORY = new Map<string, OperatorConversationMemory>();
const STORAGE_KEY = "rimvio-hub-operator-memory";

const REFERENCE_RE =
  /(그거(?:를|을|는|도|만|좀)?|그걸|그거좀|이거(?:를|을|는|도)?|이걸|이 기능|이 파일|여기(?:서|를|에)?|저거(?:를|을)?|방금 그(?:거|것)|방금 만든(?: 거| 것| 기능)?|that(?: file| one)?|this (?:file|function|one))/i;

const ACTION_VERB_RE =
  /(고쳐|수정|바꿔|변경|테스트|검증|만들어|추가|삭제|지워|열어|실행|배포|lint|typecheck|e2e)/i;

const IMPLICIT_SHORT_RE =
  /^(고쳐|수정해|바꿔|테스트해|돌려|실행해|계속|이어서|이어서 해|그걸로|그거로|해줘|부탁)$/i;

function emptyMemory(platformId: string): OperatorConversationMemory {
  return {
    platformId,
    currentGoal: null,
    currentTask: null,
    lastUtterance: null,
    lastFiles: [],
    lastCapabilities: [],
    lastSymbols: [],
    lastObjects: [],
    history: [],
    workInProgress: false,
    latestTask: null,
    latestResult: null,
    latestChangedCapabilities: [],
    latestVerification: null,
  };
}

function persistClient(memory: OperatorConversationMemory): void {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "{}") as Record<
      string,
      OperatorConversationMemory
    >;
    all[memory.platformId] = memory;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* quota */
  }
}

function hydrateClient(platformId: string): OperatorConversationMemory | null {
  if (typeof window === "undefined") return null;
  try {
    const all = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "{}") as Record<
      string,
      OperatorConversationMemory
    >;
    return all[platformId] ?? null;
  } catch {
    return null;
  }
}

export function resetOperatorMemoryForTests(platformId?: string): void {
  if (platformId) {
    MEMORY.delete(platformId);
    return;
  }
  MEMORY.clear();
}

export function readOperatorMemory(platformId: string): OperatorConversationMemory {
  const cached = MEMORY.get(platformId);
  if (cached) return cached;
  const stored = hydrateClient(platformId);
  if (stored) {
    MEMORY.set(platformId, stored);
    return stored;
  }
  return emptyMemory(platformId);
}

export function writeOperatorMemory(
  platformId: string,
  patch: Partial<OperatorConversationMemory>,
): OperatorConversationMemory {
  const prev = readOperatorMemory(platformId);
  const next: OperatorConversationMemory = {
    ...prev,
    ...patch,
    platformId,
    lastFiles: uniqueTail(patch.lastFiles ?? prev.lastFiles, 12),
    lastCapabilities: uniqueTail(patch.lastCapabilities ?? prev.lastCapabilities, 12),
    lastSymbols: uniqueTail(patch.lastSymbols ?? prev.lastSymbols, 12),
    latestChangedCapabilities: uniqueTail(
      patch.latestChangedCapabilities ?? prev.latestChangedCapabilities ?? [],
      12,
    ),
    lastObjects: uniqueTail(patch.lastObjects ?? prev.lastObjects, 12),
    history: uniqueTail(patch.history ?? prev.history, 24),
  };
  MEMORY.set(platformId, next);
  persistClient(next);
  return next;
}

function uniqueTail(items: readonly string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i]?.trim();
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.unshift(item);
    if (out.length >= max) break;
  }
  return out;
}

export function rememberOperatorFocus(
  platformId: string,
  focus: Partial<{
    files: readonly string[];
    capabilities: readonly string[];
    symbols: readonly string[];
    objects: readonly string[];
    goal: string | null;
    task: string | null;
    utterance: string;
    workInProgress: boolean;
  }>,
): OperatorConversationMemory {
  const prev = readOperatorMemory(platformId);
  return writeOperatorMemory(platformId, {
    lastFiles: [...prev.lastFiles, ...(focus.files ?? [])],
    lastCapabilities: [...prev.lastCapabilities, ...(focus.capabilities ?? [])],
    lastSymbols: [...prev.lastSymbols, ...(focus.symbols ?? [])],
    lastObjects: [...prev.lastObjects, ...(focus.objects ?? [])],
    currentGoal: focus.goal !== undefined ? focus.goal : prev.currentGoal,
    currentTask: focus.task !== undefined ? focus.task : prev.currentTask,
    lastUtterance: focus.utterance ?? prev.lastUtterance,
    history: focus.utterance ? [...prev.history, focus.utterance] : prev.history,
    workInProgress: focus.workInProgress ?? prev.workInProgress,
  });
}

export function primaryFocus(memory: OperatorConversationMemory): OperatorMemoryFocus | null {
  const recentCap = memory.latestChangedCapabilities?.[memory.latestChangedCapabilities.length - 1];
  if (recentCap) return { kind: "capability", id: recentCap, label: recentCap };
  if (memory.latestTask) return { kind: "task", id: memory.latestTask, label: memory.latestTask };
  const file = memory.lastFiles[memory.lastFiles.length - 1];
  if (file) return { kind: "file", id: file, label: file };
  const cap = memory.lastCapabilities[memory.lastCapabilities.length - 1];
  if (cap) return { kind: "capability", id: cap, label: cap };
  const symbol = memory.lastSymbols[memory.lastSymbols.length - 1];
  if (symbol) return { kind: "symbol", id: symbol, label: symbol };
  const object = memory.lastObjects[memory.lastObjects.length - 1];
  if (object) return { kind: "object", id: object, label: object };
  if (memory.currentTask) return { kind: "task", id: memory.currentTask, label: memory.currentTask };
  return null;
}

export function resolveReferences(
  utterance: string,
  memory: OperatorConversationMemory,
): ReferenceResolution {
  const text = utterance.trim();
  if (!REFERENCE_RE.test(text)) {
    return { hadReference: false, expandedUtterance: text, substitutions: [], focus: primaryFocus(memory) };
  }

  const focus = primaryFocus(memory);
  if (!focus) {
    return {
      hadReference: true,
      expandedUtterance: text,
      substitutions: [],
      focus: null,
    };
  }

  const substitutions: { from: string; to: string }[] = [];
  const expanded = text.replace(REFERENCE_RE, (match) => {
    substitutions.push({ from: match, to: focus.label });
    return focus.label;
  });

  return {
    hadReference: true,
    expandedUtterance: expanded,
    substitutions,
    focus,
  };
}

export function inferImplicitIntent(
  utterance: string,
  memory: OperatorConversationMemory,
): ImplicitIntentResult {
  const text = utterance.trim();
  const focus = primaryFocus(memory);
  const goal = memory.currentGoal ?? memory.currentTask;

  if (/방금 만든/.test(text) && (memory.latestTask || focus || goal)) {
    const target = memory.latestTask ?? focus?.label ?? goal ?? "";
    return {
      inferred: true,
      expandedUtterance: text.replace(/방금 만든(?: 거| 것| 기능)?/, target).trim(),
      reason: "latest_task_followup",
    };
  }

  if (IMPLICIT_SHORT_RE.test(text) && (focus || goal)) {
    const target = focus?.label ?? goal ?? "";
    return {
      inferred: true,
      expandedUtterance: `${target} ${text}`.trim(),
      reason: "short_followup",
    };
  }

  if (REFERENCE_RE.test(text) && ACTION_VERB_RE.test(text) && focus) {
    return {
      inferred: true,
      expandedUtterance: resolveReferences(text, memory).expandedUtterance,
      reason: "reference_action",
    };
  }

  if (text.length <= 8 && ACTION_VERB_RE.test(text) && goal) {
    return {
      inferred: true,
      expandedUtterance: `${goal} — ${text}`,
      reason: "inherit_goal",
    };
  }

  return { inferred: false, expandedUtterance: text, reason: "explicit" };
}

const GOAL_SHIFT_RE =
  /(대신|말고|취소하고|그만하고|다른 거|새로|이제부터|목표 바꿔|goal change|switch to)/i;

export function detectGoalChange(input: {
  readonly utterance: string;
  readonly memory: OperatorConversationMemory;
  readonly nextGoal: string;
}): GoalChangeResult {
  const previous = input.memory.currentGoal;
  const next = input.nextGoal.trim();
  if (!previous || !next) {
    return { changed: false, previousGoal: previous, nextGoal: next, reasonKo: null };
  }
  if (previous === next) {
    return { changed: false, previousGoal: previous, nextGoal: next, reasonKo: null };
  }

  const forced = GOAL_SHIFT_RE.test(input.utterance);
  const diverged = !next.includes(previous.slice(0, Math.min(12, previous.length))) && previous.length > 8;

  if ((input.memory.workInProgress && diverged) || forced) {
    return {
      changed: true,
      previousGoal: previous,
      nextGoal: next,
      reasonKo: forced
        ? `작업 중 목표가 바뀌었습니다. 이전: ${previous}`
        : `새 요청이 이전 목표와 다릅니다. 이전 작업은 중단합니다.`,
    };
  }

  return { changed: false, previousGoal: previous, nextGoal: next, reasonKo: null };
}

export type OperatorTurnResolution = {
  readonly originalUtterance: string;
  readonly expandedUtterance: string;
  readonly reference: ReferenceResolution;
  readonly implicit: ImplicitIntentResult;
  readonly goalChange: GoalChangeResult | null;
};

export function resolveOperatorTurn(input: {
  readonly utterance: string;
  readonly memory: OperatorConversationMemory;
  readonly nextGoal?: string | null;
}): OperatorTurnResolution {
  const reference = resolveReferences(input.utterance, input.memory);
  const implicit = inferImplicitIntent(reference.expandedUtterance, input.memory);
  const expanded = implicit.expandedUtterance;
  const goalChange = input.nextGoal
    ? detectGoalChange({
        utterance: input.utterance,
        memory: input.memory,
        nextGoal: input.nextGoal,
      })
    : null;

  return {
    originalUtterance: input.utterance,
    expandedUtterance: expanded,
    reference,
    implicit,
    goalChange,
  };
}
