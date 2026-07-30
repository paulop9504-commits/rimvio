/**
 * Context Goal State — top SSOT above Context Graph (ADR-043).
 * Progress is Goal completion (e.g. Osaka Trip Complete · 52%), not chat turns.
 * Distinct from vitality GoalSnapshot (lib/goal-engine) — that is dock/read projection.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextWorkSlotId } from "@/lib/workstream/context-work-state";
import { buildContextWorkState } from "@/lib/workstream/sync-context-work-state";
import type { IntentGoalState } from "@/lib/workstream/compile-intent-to-goal-state";
import type { WorkstreamState } from "@/lib/workstream/types";

export type ContextGoalStatus =
  | "active"
  | "blocked"
  | "awaiting_commit"
  | "complete";

export type ContextGoalState = {
  readonly contextEventId: string;
  /** e.g. Osaka Trip Complete */
  readonly goalKo: string;
  readonly goalId: string;
  /** 0–100 Goal completion. */
  readonly percent: number;
  readonly status: ContextGoalStatus;
  readonly requiredSlots: readonly ContextWorkSlotId[];
  readonly completedSlots: readonly ContextWorkSlotId[];
  readonly pendingSlots: readonly ContextWorkSlotId[];
  readonly conditions: readonly string[];
  readonly updatedAtIso: string;
};

const STORAGE_KEY = "rimvio.context-goal-state.v1";

type Store = Record<string, ContextGoalState>;

/** Node / SSR fallback so Goal State works in tests without window. */
let memoryGoalStore: Store = {};

function readStore(): Store {
  if (typeof window === "undefined") return memoryGoalStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  memoryGoalStore = store;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

const DEFAULT_TRAVEL_REQUIRED: ContextWorkSlotId[] = [
  "destination",
  "dates",
  "lodging",
  "route",
  "flight",
  "food",
];

export function readContextGoalState(
  contextEventId: string,
): ContextGoalState | null {
  const id = contextEventId.trim();
  if (!id) return null;
  return readStore()[id] ?? null;
}

export function writeContextGoalState(
  state: ContextGoalState,
): ContextGoalState {
  const store = readStore();
  store[state.contextEventId] = state;
  writeStore(store);
  return state;
}

function resolveStatus(input: {
  readonly percent: number;
  readonly pending: readonly ContextWorkSlotId[];
  readonly blocked?: boolean;
}): ContextGoalStatus {
  if (input.blocked) return "blocked";
  if (input.percent >= 100 || input.pending.length === 0) return "complete";
  if (input.percent >= 70) return "awaiting_commit";
  return "active";
}

/**
 * Rebuild Goal State from Work State (+ optional Intent compile).
 */
export function syncContextGoalState(input: {
  readonly contextEventId: string;
  readonly event?: EventCandidate | null;
  readonly workstream?: WorkstreamState | null;
  readonly intentGoal?: IntentGoalState | null;
  readonly blocked?: boolean;
}): ContextGoalState {
  const contextEventId = input.contextEventId.trim();
  const work = buildContextWorkState({
    contextEventId,
    event: input.event,
    workstream: input.workstream,
  });
  const prev = readContextGoalState(contextEventId);
  const required =
    input.intentGoal?.pendingSlots.length ||
    input.intentGoal?.confirmedHints.length
      ? ([
          ...new Set([
            ...input.intentGoal.confirmedHints,
            ...input.intentGoal.pendingSlots,
          ]),
        ] as ContextWorkSlotId[])
      : prev?.requiredSlots?.length
        ? prev.requiredSlots
        : DEFAULT_TRAVEL_REQUIRED;

  const completedSlots = required.filter((s) => work.completed.includes(s));
  const pendingSlots = required.filter((s) => !work.completed.includes(s));
  const percent =
    required.length === 0
      ? work.percent
      : Math.round((completedSlots.length / required.length) * 100);

  const goalKo =
    input.intentGoal?.goalKo?.trim() ||
    prev?.goalKo ||
    (work.title && work.title !== "Untitled"
      ? `${work.title} 완료`
      : "목표 완료");

  const state: ContextGoalState = {
    contextEventId,
    goalKo,
    goalId:
      input.intentGoal?.goalId ||
      prev?.goalId ||
      `goal:${contextEventId}`,
    percent,
    status: resolveStatus({
      percent,
      pending: pendingSlots,
      blocked: input.blocked,
    }),
    requiredSlots: required,
    completedSlots,
    pendingSlots,
    conditions: input.intentGoal?.conditions ?? prev?.conditions ?? [],
    updatedAtIso: new Date().toISOString(),
  };
  return writeContextGoalState(state);
}

export function ensureContextGoalState(input: {
  readonly contextEventId: string;
  readonly event?: EventCandidate | null;
  readonly workstream?: WorkstreamState | null;
  readonly intentGoal?: IntentGoalState | null;
}): ContextGoalState {
  const existing = readContextGoalState(input.contextEventId);
  if (existing && !input.intentGoal) return existing;
  return syncContextGoalState(input);
}

export function formatGoalProgressLine(goal: ContextGoalState): string {
  return `${goal.goalKo} · ${goal.percent}%`;
}
