/**
 * Reflection — post-Commit learning notes (ADR-046).
 * 3–5 lines: what worked · what failed · how to improve. Higher value than raw History.
 */

export type AgentReflection = {
  readonly id: string;
  readonly contextEventId: string;
  readonly atIso: string;
  readonly goalKo: string;
  readonly workedKo: string;
  readonly failedKo: string;
  readonly improveKo: string;
  readonly lines: readonly string[];
};

const STORAGE_KEY = "rimvio.agent-reflections.v1";
let memoryStore: Record<string, AgentReflection[]> = {};

function readStore(): Record<string, AgentReflection[]> {
  if (typeof window === "undefined") return memoryStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, AgentReflection[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, AgentReflection[]>): void {
  memoryStore = store;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function readAgentReflections(
  contextEventId: string,
): readonly AgentReflection[] {
  const id = contextEventId.trim();
  if (!id) return [];
  return readStore()[id] ?? [];
}

export function readLatestAgentReflection(
  contextEventId: string,
): AgentReflection | null {
  const rows = readAgentReflections(contextEventId);
  return rows[rows.length - 1] ?? null;
}

/**
 * Write a short Reflection after Reality Commit.
 */
export function writeAgentReflection(input: {
  readonly contextEventId: string;
  readonly goalKo?: string | null;
  readonly committedLabels?: readonly string[];
  readonly verificationBlocked?: boolean;
  readonly repairCount?: number;
  readonly opportunityCount?: number;
}): AgentReflection {
  const contextEventId = input.contextEventId.trim();
  const goalKo = input.goalKo?.trim() || "Goal";
  const labels = input.committedLabels ?? [];
  const repairCount = input.repairCount ?? 0;
  const opportunityCount = input.opportunityCount ?? 0;

  const workedKo =
    labels.length > 0
      ? `Commit 성공: ${labels.slice(0, 3).join(" · ")}`
      : "Reality Commit이 Context Graph에 반영됨";

  const failedKo =
    input.verificationBlocked
      ? "Verification이 Commit을 한 번 막았음 — 일정 실현 가능성 재검토 필요"
      : repairCount > 0
        ? `Self Repair ${repairCount}회 후 통과 — 초기 계획에 마찰 있었음`
        : "치명적 실패 없음";

  const improveKo =
    opportunityCount > 0
      ? "다음엔 Opportunity(할인·가격·기상)를 Goal 초기에 더 일찍 반영"
      : repairCount > 0
        ? "다음엔 Verify 입력을 Commit 전에 더 이르게 채우기"
        : "다음엔 Preference Graph로 후보 순위를 더 날카롭게";

  const lines = [
    `Goal: ${goalKo}`,
    `잘된 점: ${workedKo}`,
    `아쉬운 점: ${failedKo}`,
    `다음: ${improveKo}`,
    "학습: Commit 품질 = Verify 통과 + Goal % 상승",
  ].slice(0, 5);

  const reflection: AgentReflection = {
    id: `refl:${Date.now().toString(36)}`,
    contextEventId,
    atIso: new Date().toISOString(),
    goalKo,
    workedKo,
    failedKo,
    improveKo,
    lines,
  };

  const store = readStore();
  const prev = store[contextEventId] ?? [];
  store[contextEventId] = [...prev, reflection].slice(-20);
  writeStore(store);
  return reflection;
}

export function formatAgentReflectionBrief(
  reflection: AgentReflection | null,
): string {
  if (!reflection) return "Reflection: (none)";
  return ["Reflection:", ...reflection.lines.map((l) => `  · ${l}`)].join(
    "\n",
  );
}

export function clearAgentReflectionsForTests(contextEventId?: string): void {
  if (!contextEventId) {
    memoryStore = {};
    return;
  }
  const store = readStore();
  delete store[contextEventId.trim()];
  writeStore(store);
}
