import type { HitRunFeedbackEntry } from "@/lib/action-chat/hit-run-feedback/types";
import type { LiveTurnLogEntry } from "@/lib/self-learning/live-turn-types";
import type { FailureKind } from "@/lib/self-learning/types";
import { buildInteractionRecords } from "@/lib/self-learning/read-interaction-log";

export type SelfLearningDayBucket = {
  day: string;
  label: string;
  count: number;
};

export type SelfLearningBarRow = {
  label: string;
  count: number;
};

export type SelfLearningSummary = {
  builtAt: string;
  outputTurnCount: number;
  failureCount: number;
  failureRatePct: number | null;
  feedbackUp: number;
  feedbackDown: number;
  avgLatencyMs: number | null;
  turnsByDay: SelfLearningDayBucket[];
  intentBars: SelfLearningBarRow[];
  failureKindBars: SelfLearningBarRow[];
};

const DAY_MS = 86_400_000;
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function formatDayLabel(isoDay: string): string {
  const date = new Date(`${isoDay}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDay.slice(5);
  }
  return `${isoDay.slice(5)} (${DAY_LABELS[date.getDay()]})`;
}

function buildLast7DayKeys(reference = new Date()): string[] {
  const keys: string[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(reference.getTime() - offset * DAY_MS);
    keys.push(date.toISOString().slice(0, 10));
  }
  return keys;
}

function pickIntentLabel(turn: LiveTurnLogEntry): string {
  return (
    turn.routing?.ai_intent?.trim() ||
    turn.routing?.routing_patch?.trim() ||
    turn.routing?.chat_axis_route?.trim() ||
    turn.chatAxis?.trim() ||
    "unknown"
  );
}

function topCounts(
  map: Map<string, number>,
  limit = 5,
): SelfLearningBarRow[] {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

/** Dev Intelligence — aggregate live turns + hit/run feedback for mini charts. */
export function summarizeSelfLearning(input: {
  liveTurns: readonly LiveTurnLogEntry[];
  feedbackEntries?: readonly HitRunFeedbackEntry[];
  now?: Date;
}): SelfLearningSummary {
  const now = input.now ?? new Date();
  const outputTurns = input.liveTurns.filter((row) => row.stage === "output");
  const failureFromTurns = outputTurns.filter((row) => row.isFailure).length;

  const records = buildInteractionRecords({
    feedbackEntries: input.feedbackEntries ? [...input.feedbackEntries] : undefined,
  });
  const failureFromFeedback = records.filter((row) => row.isFailure).length;
  const failureCount = Math.max(failureFromTurns, failureFromFeedback);

  const feedbackUp = (input.feedbackEntries ?? []).filter(
    (row) => row.verdict === "up",
  ).length;
  const feedbackDown = (input.feedbackEntries ?? []).filter(
    (row) => row.verdict === "down",
  ).length;

  const latencySamples = outputTurns
    .map((row) => row.latencyMs)
    .filter((value): value is number => typeof value === "number" && value > 0);
  const avgLatencyMs =
    latencySamples.length > 0
      ? Math.round(
          latencySamples.reduce((sum, value) => sum + value, 0) /
            latencySamples.length,
        )
      : null;

  const dayKeys = buildLast7DayKeys(now);
  const turnsByDayMap = new Map(dayKeys.map((day) => [day, 0]));
  for (const turn of outputTurns) {
    const day = turn.timestamp.slice(0, 10);
    if (turnsByDayMap.has(day)) {
      turnsByDayMap.set(day, (turnsByDayMap.get(day) ?? 0) + 1);
    }
  }
  const turnsByDay = dayKeys.map((day) => ({
    day,
    label: formatDayLabel(day),
    count: turnsByDayMap.get(day) ?? 0,
  }));

  const intentMap = new Map<string, number>();
  for (const turn of outputTurns) {
    const label = pickIntentLabel(turn);
    intentMap.set(label, (intentMap.get(label) ?? 0) + 1);
  }

  const failureKindMap = new Map<string, number>();
  for (const turn of outputTurns) {
    if (!turn.isFailure || !turn.failureKind) {
      continue;
    }
    failureKindMap.set(
      turn.failureKind,
      (failureKindMap.get(turn.failureKind) ?? 0) + 1,
    );
  }
  for (const record of records) {
    if (!record.isFailure) {
      continue;
    }
    const kind = record.failureKind as FailureKind;
    failureKindMap.set(kind, (failureKindMap.get(kind) ?? 0) + 1);
  }

  const outputTurnCount = outputTurns.length;
  const failureRatePct =
    outputTurnCount > 0
      ? Math.round((failureCount / outputTurnCount) * 100)
      : null;

  return {
    builtAt: now.toISOString(),
    outputTurnCount,
    failureCount,
    failureRatePct,
    feedbackUp,
    feedbackDown,
    avgLatencyMs,
    turnsByDay,
    intentBars: topCounts(intentMap),
    failureKindBars: topCounts(failureKindMap, 4),
  };
}
