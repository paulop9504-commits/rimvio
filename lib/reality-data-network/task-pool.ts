/**
 * Task Pool — in-memory SSOT with optional Supabase persist (R2).
 */

import type {
  ContributorProfile,
  DataSubmission,
  RealityTask,
  RealityTaskType,
  VerifierResponse,
} from "@/lib/reality-data-network/types";
import {
  DEFAULT_CONSENSUS_THRESHOLD,
  DEFAULT_CONSENSUS_VERIFIERS,
  DEFAULT_YES_NO_OPTIONS,
  REALITY_TASK_TYPE_META,
} from "@/lib/reality-data-network/types";
import {
  buildSuggestedRealityPatch,
  patchToAiPreLabel,
  type PreLabelInput,
} from "@/lib/reality-data-network/ai-pre-label";
import {
  computeVerifierPayout,
  evaluateConsensus,
} from "@/lib/reality-data-network/consensus-engine";
import { recordContributorPayout } from "@/lib/contributor-ledger/record-contributor-payout";
import { computeContributorRewardV2 } from "@/lib/contributor-ledger/reward-formula-v2";
import { persistRealityTaskAsync } from "@/lib/reality-data-network/persist-tasks";

const TASKS_KEY = "rimvio-rdn-tasks-v2";
const RESPONSES_KEY = "rimvio-rdn-responses-v2";
const SUBMISSIONS_KEY = "rimvio-rdn-submissions-v2";
const PROFILES_KEY = "rimvio-rdn-profiles-v2";

const memoryStore = new Map<string, unknown>();

let taskCounter = 0;
let responseCounter = 0;
let submissionCounter = 0;

export function nextTaskId(): string {
  taskCounter += 1;
  return `TASK-${Date.now()}-${taskCounter}`;
}

function nextResponseId(): string {
  responseCounter += 1;
  return `RSP-${Date.now()}-${responseCounter}`;
}

function nextSubmissionId(): string {
  submissionCounter += 1;
  return `SUB-${Date.now()}-${submissionCounter}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return (memoryStore.get(key) as T | undefined) ?? fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") {
    memoryStore.set(key, value);
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}

const SEED_TASKS: readonly RealityTask[] = [
  {
    taskId: "TASK-48291",
    taskType: "photo_authenticity",
    titleKo: "객실 사진 진위",
    targetLabelKo: "오사카 ○○호텔 디럭스 더블룸",
    domain: "lodging",
    aiPreLabel: { bed: "double", bathtub: true, view: "city" },
    suggestedPatch: {
      epistemic: "inferred",
      domain: "lodging",
      attributes: { bed: "double", bathtub: true, view: "city" },
      source: "heuristic",
      confidence: 0.62,
    },
    options: DEFAULT_YES_NO_OPTIONS,
    difficulty: 2,
    baseRewardKrw: 10,
    requiredVerifiers: DEFAULT_CONSENSUS_VERIFIERS,
    consensusThreshold: DEFAULT_CONSENSUS_THRESHOLD,
    status: "in_review",
    supplierId: "supplier-demo",
    supplierLabel: "현장 Contributor",
    submittedAt: new Date(Date.now() - 3600_000).toISOString(),
    mediaUrl: null,
    targetRef: "lodging:osaka-demo",
    contextEventId: null,
    consensusConfidence: null,
    consensusVerdict: null,
    spawnReason: null,
  },
];

function seedIfEmpty(): void {
  if (readJson<RealityTask[]>(TASKS_KEY, []).length === 0) {
    writeJson(TASKS_KEY, [...SEED_TASKS]);
  }
  if (readJson<ContributorProfile[]>(PROFILES_KEY, []).length === 0) {
    writeJson(PROFILES_KEY, [
      {
        contributorId: "supplier-demo",
        displayName: "현장 Contributor",
        roles: ["supplier"],
        accuracyPct: 100,
        reliabilityTier: "regular",
        qualityMultiplier: 1,
        totalEarnedKrw: 120,
        tasksCompleted: 4,
        verifierApproved: false,
      },
      {
        contributorId: "verifier-demo",
        displayName: "검수자 A",
        roles: ["verifier"],
        accuracyPct: 99.2,
        reliabilityTier: "expert",
        qualityMultiplier: 1.5,
        totalEarnedKrw: 8420,
        tasksCompleted: 312,
        verifierAppliedAt: new Date(Date.now() - 86400_000 * 14).toISOString(),
        verifierApproved: true,
      },
    ]);
  }
}

export function readRealityTasks(): readonly RealityTask[] {
  seedIfEmpty();
  return readJson<RealityTask[]>(TASKS_KEY, []);
}

export function getRealityTask(taskId: string): RealityTask | null {
  return readRealityTasks().find((t) => t.taskId === taskId) ?? null;
}

export function readVerifierResponses(): readonly VerifierResponse[] {
  return readJson<VerifierResponse[]>(RESPONSES_KEY, []);
}

export function readDataSubmissions(): readonly DataSubmission[] {
  return readJson<DataSubmission[]>(SUBMISSIONS_KEY, []);
}

export function readContributorProfiles(): readonly ContributorProfile[] {
  seedIfEmpty();
  return readJson<ContributorProfile[]>(PROFILES_KEY, []);
}

export function getContributorProfile(id: string): ContributorProfile | null {
  return readContributorProfiles().find((p) => p.contributorId === id) ?? null;
}

export function upsertContributorProfile(profile: ContributorProfile): void {
  const rows = [...readContributorProfiles()];
  const idx = rows.findIndex((p) => p.contributorId === profile.contributorId);
  if (idx >= 0) rows[idx] = profile;
  else rows.push(profile);
  writeJson(PROFILES_KEY, rows);
}

export function createRealityTask(input: {
  readonly taskType: RealityTaskType;
  readonly titleKo: string;
  readonly targetLabelKo: string;
  readonly domain: RealityTask["domain"];
  readonly supplierId: string;
  readonly supplierLabel: string;
  readonly preLabel?: PreLabelInput;
  readonly aiPreLabel?: Readonly<Record<string, unknown>>;
  readonly targetRef?: string | null;
  readonly contextEventId?: string | null;
  readonly spawnReason?: string | null;
  readonly mediaUrl?: string | null;
}): RealityTask {
  const meta = REALITY_TASK_TYPE_META[input.taskType];
  const suggestedPatch = input.preLabel
    ? buildSuggestedRealityPatch(input.preLabel)
    : null;
  const aiPreLabel =
    input.aiPreLabel ??
    (suggestedPatch ? patchToAiPreLabel(suggestedPatch) : undefined);

  const task: RealityTask = {
    taskId: nextTaskId(),
    taskType: input.taskType,
    titleKo: input.titleKo,
    targetLabelKo: input.targetLabelKo,
    domain: input.domain,
    aiPreLabel,
    suggestedPatch,
    options: DEFAULT_YES_NO_OPTIONS,
    difficulty: meta.difficulty,
    baseRewardKrw: meta.baseRewardKrw,
    requiredVerifiers: DEFAULT_CONSENSUS_VERIFIERS,
    consensusThreshold: DEFAULT_CONSENSUS_THRESHOLD,
    status: "open",
    supplierId: input.supplierId,
    supplierLabel: input.supplierLabel,
    submittedAt: new Date().toISOString(),
    mediaUrl: input.mediaUrl ?? null,
    targetRef: input.targetRef ?? null,
    contextEventId: input.contextEventId ?? null,
    spawnReason: input.spawnReason ?? null,
  };

  writeJson(TASKS_KEY, [...readRealityTasks(), task]);
  void persistRealityTaskAsync(task);
  notifyRdnStoreUpdated();
  return task;
}

export function submitRealityData(input: {
  readonly supplierId: string;
  readonly supplierLabel: string;
  readonly titleKo: string;
  readonly targetLabelKo: string;
  readonly domain: RealityTask["domain"];
  readonly taskType: RealityTaskType;
  readonly preLabel?: PreLabelInput;
}): { submission: DataSubmission; task: RealityTask } {
  const meta = REALITY_TASK_TYPE_META[input.taskType];
  const task = createRealityTask({
    ...input,
    preLabel: input.preLabel ?? {
      domain: input.domain,
      titleKo: input.titleKo,
      targetLabelKo: input.targetLabelKo,
    },
  });

  const submission: DataSubmission = {
    submissionId: nextSubmissionId(),
    supplierId: input.supplierId,
    titleKo: input.titleKo,
    domain: input.domain,
    taskType: input.taskType,
    status: "pending",
    taskId: task.taskId,
    submittedAt: task.submittedAt,
    epistemic: "observed",
    targetRef: task.targetRef ?? null,
  };

  writeJson(SUBMISSIONS_KEY, [...readDataSubmissions(), submission]);

  const supplier = getContributorProfile(input.supplierId);
  const supplierReward = computeContributorRewardV2({
    baseRewardKrw: Math.round(meta.baseRewardKrw * 0.5),
    qualityMultiplier: supplier?.qualityMultiplier ?? 1,
    difficulty: meta.difficulty,
    uniquenessScore: 0.55,
  });
  recordContributorPayout({
    contributorId: input.supplierId,
    kind: "data_submission",
    amountKrw: supplierReward.amountKrw,
    taskId: task.taskId,
    summaryKo: `데이터 제출 · ${input.titleKo}`,
    rewardFactors: supplierReward.factors as unknown as Record<string, number>,
  });

  if (supplier) {
    upsertContributorProfile({
      ...supplier,
      totalEarnedKrw: supplier.totalEarnedKrw + supplierReward.amountKrw,
      tasksCompleted: supplier.tasksCompleted + 1,
    });
  }

  notifyRdnStoreUpdated();
  return { submission, task };
}

export function applyVerifierResponse(input: {
  readonly taskId: string;
  readonly verifierId: string;
  readonly answerId: string;
  readonly answerLabelKo: string;
}): {
  response: VerifierResponse;
  task: RealityTask | null;
  payoutKrw: number;
  consensus: ReturnType<typeof evaluateConsensus>;
} {
  const tasks = [...readRealityTasks()];
  const taskIdx = tasks.findIndex((t) => t.taskId === input.taskId);
  if (taskIdx < 0) throw new Error("task_not_found");

  const dup = readVerifierResponses().some(
    (r) => r.taskId === input.taskId && r.verifierId === input.verifierId,
  );
  if (dup) throw new Error("already_responded");

  const response: VerifierResponse = {
    responseId: nextResponseId(),
    taskId: input.taskId,
    verifierId: input.verifierId,
    answerId: input.answerId,
    answerLabelKo: input.answerLabelKo,
    at: new Date().toISOString(),
    latencyMs: Math.floor(Math.random() * 8000) + 2000,
  };

  writeJson(RESPONSES_KEY, [...readVerifierResponses(), response]);

  const allResponses = [...readVerifierResponses(), response];
  let task = tasks[taskIdx]!;
  const consensus = evaluateConsensus({ task, responses: allResponses });

  task = {
    ...task,
    status: consensus.taskStatus,
    consensusConfidence: consensus.result.confidence,
    consensusVerdict: consensus.result.verdict,
  };

  const subs = readDataSubmissions().map((s) =>
    s.taskId === task.taskId
      ? {
          ...s,
          status: consensus.submissionStatus,
          epistemic:
            consensus.epistemic === "confirmed"
              ? ("confirmed" as const)
              : consensus.epistemic === "inferred"
                ? ("inferred" as const)
                : s.epistemic,
        }
      : s,
  );
  writeJson(SUBMISSIONS_KEY, subs);

  tasks[taskIdx] = task;
  writeJson(TASKS_KEY, tasks);
  void persistRealityTaskAsync(task);

  const verifier = getContributorProfile(input.verifierId);
  const verifierReward = computeContributorRewardV2({
    baseRewardKrw: task.baseRewardKrw,
    qualityMultiplier: verifier?.qualityMultiplier ?? 1,
    difficulty: task.difficulty,
    verificationConfidence: consensus.result.confidence,
    uniquenessScore: 0.5,
  });
  const payoutKrw = verifierReward.amountKrw;

  recordContributorPayout({
    contributorId: input.verifierId,
    kind: "human_verification",
    amountKrw: payoutKrw,
    taskId: task.taskId,
    summaryKo: `검수 · ${task.titleKo}`,
    rewardFactors: verifierReward.factors as unknown as Record<string, number>,
  });

  if (verifier) {
    upsertContributorProfile({
      ...verifier,
      totalEarnedKrw: verifier.totalEarnedKrw + payoutKrw,
      tasksCompleted: verifier.tasksCompleted + 1,
    });
  }

  notifyRdnStoreUpdated();
  return { response, task, payoutKrw, consensus };
}

export function applyVerifierApplication(input: {
  readonly contributorId: string;
  readonly displayName: string;
}): ContributorProfile {
  const existing = getContributorProfile(input.contributorId);
  if (existing?.verifierApproved) return existing;

  const profile: ContributorProfile = {
    contributorId: input.contributorId,
    displayName: input.displayName,
    roles: existing
      ? ([...new Set([...existing.roles, "verifier"])] as ContributorProfile["roles"])
      : (["verifier"] as ContributorProfile["roles"]),
    accuracyPct: existing?.accuracyPct ?? 100,
    reliabilityTier: "new",
    qualityMultiplier: 1,
    totalEarnedKrw: existing?.totalEarnedKrw ?? 0,
    tasksCompleted: existing?.tasksCompleted ?? 0,
    verifierAppliedAt: new Date().toISOString(),
    verifierApproved: true,
  };
  upsertContributorProfile(profile);
  notifyRdnStoreUpdated();
  return profile;
}

export function resetRealityDataNetworkForTests(): void {
  memoryStore.clear();
  if (typeof window !== "undefined") {
    for (const k of [TASKS_KEY, RESPONSES_KEY, SUBMISSIONS_KEY, PROFILES_KEY]) {
      localStorage.removeItem(k);
    }
  }
  taskCounter = 0;
  responseCounter = 0;
  submissionCounter = 0;
}

export const RDN_STORE_UPDATED = "rimvio-rdn-store-updated";

export function notifyRdnStoreUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(RDN_STORE_UPDATED));
  }
}
