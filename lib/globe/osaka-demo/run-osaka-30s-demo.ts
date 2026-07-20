/**
 * Osaka 30s demo runner — controllable theater session.
 * Scenes 1–5 auto-play → pause for one-tap 승인. Supports 뒤로 / 취소.
 */

import { tryRunContextNlActionAsync } from "@/lib/action-planner";
import { ensureTripContextEvent } from "@/lib/experience-run/ensure-trip-context-event";
import { bindGlobeContextAgent } from "@/lib/globe/context-agent/globe-context-agent-bridge";
import { clearPlaceExploreSession } from "@/lib/globe/entity-explore/place-explore-session-store";
import {
  OSAKA_30S_DEMO_STEPS,
  OSAKA_30S_DEMO_VERSION,
  type Osaka30sDemoProgress,
  type Osaka30sDemoStepId,
} from "@/lib/globe/osaka-demo/osaka-30s-demo-steps";
import {
  resetOsakaDemoTheaterState,
  writeOsakaDemoTheaterState,
  type OsakaDemoPrepCardV1,
} from "@/lib/globe/osaka-demo/osaka-demo-theater";
import {
  deleteSessionGraph,
  readSessionGraph,
  writeSessionGraph,
  type SessionGraphV1,
} from "@/lib/graph-command";
import { runRealityIngressPipeline } from "@/lib/reality-pipeline/run-reality-ingress-pipeline";
import {
  commitRealityQueueClient,
  deletePreparedRealityOperation,
  dispatchRealityCommitPulse,
  listPreparedRealityOperations,
  preparedOperationsAsQueueItems,
  upsertPreparedRealityOperations,
} from "@/lib/reality-queue";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";
import { OSAKA_APA_NAMBA } from "@/lib/search-engine/osaka-demo-catalog";

export type Osaka30sDemoHandlers = {
  readonly onProgress?: (progress: Osaka30sDemoProgress) => void;
  readonly onFlyTo?: (lat: number, lng: number) => void;
  readonly stepDelayMs?: number;
};

type StepSnapshot = {
  readonly stepIndex: number;
  readonly stepId: Osaka30sDemoStepId;
  readonly graph: SessionGraphV1 | null;
  readonly operations: readonly RealityOperationV1[];
  readonly prepCard: OsakaDemoPrepCardV1 | null;
  readonly replyKo: string | null;
};

type ActiveDemo = {
  aborted: boolean;
  contextEventId: string | null;
  lastReply: string | null;
  snapshots: StepSnapshot[];
  handlers: Osaka30sDemoHandlers;
  delayMs: number;
};

let active: ActiveDemo | null = null;

function sleep(ms: number, demo: ActiveDemo): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    if (demo.aborted) {
      clearTimeout(timer);
      resolve();
    }
  });
}

function cloneGraph(graph: SessionGraphV1 | null): SessionGraphV1 | null {
  if (!graph) {
    return null;
  }
  return JSON.parse(JSON.stringify(graph)) as SessionGraphV1;
}

function cloneOps(
  contextEventId: string,
): readonly RealityOperationV1[] {
  return listPreparedRealityOperations()
    .filter((op) => op.contextEventId === contextEventId)
    .map((op) => JSON.parse(JSON.stringify(op)) as RealityOperationV1);
}

function restoreOps(
  contextEventId: string,
  operations: readonly RealityOperationV1[],
): void {
  for (const op of listPreparedRealityOperations()) {
    if (op.contextEventId === contextEventId) {
      deletePreparedRealityOperation(op.operationId);
    }
  }
  if (operations.length > 0) {
    upsertPreparedRealityOperations(operations);
  }
}

function buildPrepCard(contextEventId: string): OsakaDemoPrepCardV1 | null {
  const graph = readSessionGraph(contextEventId);
  if (!graph) {
    return null;
  }
  const lodging =
    graph.nodes.find((node) => node.kind === "lodging" && node.pinned) ??
    graph.nodes.find((node) => node.kind === "lodging");
  const eatery =
    graph.nodes.find(
      (node) =>
        node.kind === "eatery" &&
        node.visible &&
        graph.selectionIds.includes(node.id),
    ) ??
    graph.nodes.find((node) => node.kind === "eatery" && node.visible);
  if (!eatery) {
    return null;
  }
  return {
    version: 1,
    lodgingLabelKo: lodging?.labelKo ?? "APA",
    eateryLabelKo: eatery.labelKo,
    reserveAtLabelKo: "19:00",
  };
}

function emitProgress(progress: Osaka30sDemoProgress): void {
  active?.handlers.onProgress?.(progress);
}

function baseProgress(): Omit<
  Osaka30sDemoProgress,
  "stepId" | "stepIndex" | "status" | "done" | "errorKo" | "awaitingHuman" | "canRewind"
> {
  return {
    version: OSAKA_30S_DEMO_VERSION,
    contextEventId: active?.contextEventId ?? null,
    replyKo: active?.lastReply ?? null,
  };
}

function syncTheater(input: {
  stepId: Osaka30sDemoStepId | null;
  stepIndex: number;
  prepCard?: OsakaDemoPrepCardV1 | null;
  commitPulseLabelKo?: string | null;
  awaitingApprove?: boolean;
  showCompareArcs?: boolean;
}): void {
  if (typeof window === "undefined") {
    return;
  }
  const canRewind = (active?.snapshots.length ?? 0) > 0;
  writeOsakaDemoTheaterState({
    active: true,
    contextEventId: active?.contextEventId ?? null,
    stepId: input.stepId,
    stepIndex: input.stepIndex,
    prepCard: input.prepCard ?? null,
    commitPulseLabelKo: input.commitPulseLabelKo ?? null,
    awaitingApprove: input.awaitingApprove ?? false,
    canRewind,
    showCompareArcs: input.showCompareArcs ?? true,
  });
}

function pushSnapshot(
  stepIndex: number,
  stepId: Osaka30sDemoStepId,
  prepCard: OsakaDemoPrepCardV1 | null,
): void {
  if (!active?.contextEventId) {
    return;
  }
  active.snapshots.push({
    stepIndex,
    stepId,
    graph: cloneGraph(readSessionGraph(active.contextEventId)),
    operations: cloneOps(active.contextEventId),
    prepCard,
    replyKo: active.lastReply,
  });
}

async function runCompareIfPossible(
  contextEventId: string,
  utterance: string,
): Promise<void> {
  await tryRunContextNlActionAsync({
    utterance,
    contextEventId,
    anchorLat: OSAKA_APA_NAMBA.lat,
    anchorLng: OSAKA_APA_NAMBA.lng,
    contextLabelKo: "오사카 여행",
  });
}

async function executeStep(
  stepId: Osaka30sDemoStepId,
  utterance: string,
): Promise<void> {
  if (!active || active.aborted) {
    return;
  }
  const demo = active;

  if (stepId === "trip") {
    const event = ensureTripContextEvent({
      message: "오사카 주말 여행 만들어줘",
      profile: "leisure_travel",
    });
    demo.contextEventId = event.id;
    if (typeof window !== "undefined") {
      bindGlobeContextAgent(event.id);
    }
    runRealityIngressPipeline({
      contextEventId: event.id,
      utterance: "오사카 여행 만들어",
      contextLabelKo: "오사카 여행",
      destinationLabelKo: "오사카",
      seedExecutionInbox: false,
    });
    demo.handlers.onFlyTo?.(OSAKA_APA_NAMBA.lat, OSAKA_APA_NAMBA.lng);
    demo.lastReply = "오사카 여행을 만들었어요";
    return;
  }

  if (!demo.contextEventId) {
    throw new Error("missing_context");
  }

  const result = await tryRunContextNlActionAsync({
    utterance,
    contextEventId: demo.contextEventId,
    anchorLat: OSAKA_APA_NAMBA.lat,
    anchorLng: OSAKA_APA_NAMBA.lng,
    contextLabelKo: "오사카 여행",
  });
  if (!result) {
    throw new Error(`step_failed:${stepId}`);
  }
  demo.lastReply = result.assistantReplyKo;

  if (stepId === "pin_apa") {
    if (typeof window !== "undefined") {
      clearPlaceExploreSession();
    }
    demo.handlers.onFlyTo?.(OSAKA_APA_NAMBA.lat, OSAKA_APA_NAMBA.lng);
    // Silent compare — Namba ↔ Umeda connection line.
    await runCompareIfPossible(
      demo.contextEventId,
      "APA 난바랑 APA 우메다 비교해",
    );
  }

  if (stepId === "local_filter") {
    const graph = readSessionGraph(demo.contextEventId);
    const eateries = (graph?.nodes ?? []).filter(
      (node) => node.kind === "eatery" && node.visible,
    );
    if (eateries.length >= 2) {
      const left = eateries[0]!.labelKo;
      const right = eateries[1]!.labelKo;
      await runCompareIfPossible(
        demo.contextEventId,
        `${left}랑 ${right} 비교해`,
      );
    }
  }
}

/**
 * Auto-play through first_reserve, then pause for human 승인.
 */
export async function runOsaka30sDemo(
  handlers: Osaka30sDemoHandlers = {},
): Promise<Osaka30sDemoProgress> {
  if (active && !active.aborted) {
    cancelOsaka30sDemo();
  }

  active = {
    aborted: false,
    contextEventId: null,
    lastReply: null,
    snapshots: [],
    handlers,
    delayMs: handlers.stepDelayMs ?? 480,
  };

  if (typeof window !== "undefined") {
    resetOsakaDemoTheaterState();
    clearPlaceExploreSession();
  }

  const autoSteps = OSAKA_30S_DEMO_STEPS.filter((step) => step.id !== "approve");

  try {
    for (let index = 0; index < autoSteps.length; index += 1) {
      if (active.aborted) {
        break;
      }
      const step = autoSteps[index]!;
      syncTheater({
        stepId: step.id,
        stepIndex: index,
        showCompareArcs: index >= 1,
      });
      emitProgress({
        ...baseProgress(),
        stepId: step.id,
        stepIndex: index,
        status: "running",
        done: false,
        awaitingHuman: false,
        canRewind: active.snapshots.length > 0,
        errorKo: null,
      });

      await executeStep(step.id, step.utterance);
      if (active.aborted) {
        break;
      }

      const prep =
        step.id === "first_reserve" && active.contextEventId
          ? buildPrepCard(active.contextEventId)
          : null;
      if (step.id === "first_reserve" && prep) {
        active.lastReply = "예약 준비 완료 · 승인만 누르면 끝나요";
      }

      pushSnapshot(index, step.id, prep);
      syncTheater({
        stepId: step.id,
        stepIndex: index,
        prepCard: prep,
        showCompareArcs: true,
      });
      emitProgress({
        ...baseProgress(),
        stepId: step.id,
        stepIndex: index,
        status: "done",
        done: false,
        awaitingHuman: false,
        canRewind: true,
        errorKo: null,
      });
      await sleep(active.delayMs, active);
    }

    if (active.aborted) {
      const cancelled: Osaka30sDemoProgress = {
        ...baseProgress(),
        stepId: null,
        stepIndex: -1,
        status: "error",
        done: false,
        awaitingHuman: false,
        canRewind: false,
        errorKo: "cancelled",
      };
      emitProgress(cancelled);
      return cancelled;
    }

    const approveIndex = OSAKA_30S_DEMO_STEPS.findIndex(
      (step) => step.id === "approve",
    );
    const prep = active.contextEventId
      ? buildPrepCard(active.contextEventId)
      : null;
    active.lastReply = "승인하면 예약을 반영해요";
    syncTheater({
      stepId: "approve",
      stepIndex: approveIndex,
      prepCard: prep,
      awaitingApprove: true,
      showCompareArcs: true,
    });
    const awaiting: Osaka30sDemoProgress = {
      ...baseProgress(),
      stepId: "approve",
      stepIndex: approveIndex,
      status: "awaiting_approve",
      done: false,
      awaitingHuman: true,
      canRewind: active.snapshots.length > 0,
      errorKo: null,
    };
    emitProgress(awaiting);
    return awaiting;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "demo_failed";
    const failed: Osaka30sDemoProgress = {
      ...baseProgress(),
      stepId: null,
      stepIndex: -1,
      status: "error",
      done: false,
      awaitingHuman: false,
      canRewind: false,
      errorKo: message,
    };
    emitProgress(failed);
    if (typeof window !== "undefined") {
      resetOsakaDemoTheaterState();
    }
    active = null;
    return failed;
  }
}

/** Scene 6 — one-tap Commit. */
export async function approveOsaka30sDemo(): Promise<Osaka30sDemoProgress> {
  if (!active?.contextEventId) {
    return {
      version: OSAKA_30S_DEMO_VERSION,
      contextEventId: null,
      stepId: "approve",
      stepIndex: OSAKA_30S_DEMO_STEPS.length - 1,
      status: "error",
      replyKo: null,
      done: false,
      awaitingHuman: false,
      canRewind: false,
      errorKo: "no_active_demo",
    };
  }

  const contextEventId = active.contextEventId;
  const approveIndex = OSAKA_30S_DEMO_STEPS.length - 1;
  emitProgress({
    ...baseProgress(),
    stepId: "approve",
    stepIndex: approveIndex,
    status: "running",
    done: false,
    awaitingHuman: false,
    canRewind: false,
    errorKo: null,
  });

  const items = preparedOperationsAsQueueItems().filter(
    (item) => item.contextEventId === contextEventId,
  );
  const canCommit =
    items.length > 0 &&
    !items.some(
      (item) => item.status === "needs_review" || item.status === "running",
    );
  const result = await commitRealityQueueClient({
    items,
    canCommit,
    promotePendingOnSign: true,
  });
  if (!result.ok) {
    const failed: Osaka30sDemoProgress = {
      ...baseProgress(),
      stepId: "approve",
      stepIndex: approveIndex,
      status: "error",
      done: false,
      awaitingHuman: true,
      canRewind: true,
      errorKo: `commit_failed:${result.reason}`,
    };
    emitProgress(failed);
    return failed;
  }

  if (typeof window !== "undefined") {
    dispatchRealityCommitPulse(contextEventId);
  }
  active.lastReply = "예약을 반영했어요";
  const prep = buildPrepCard(contextEventId);
  syncTheater({
    stepId: "approve",
    stepIndex: approveIndex,
    prepCard: prep,
    commitPulseLabelKo: "예약 완료",
    awaitingApprove: false,
    showCompareArcs: true,
  });
  const done: Osaka30sDemoProgress = {
    ...baseProgress(),
    stepId: "approve",
    stepIndex: approveIndex,
    status: "done",
    done: true,
    awaitingHuman: false,
    canRewind: false,
    errorKo: null,
  };
  emitProgress(done);
  active = null;
  return done;
}

/** Full teardown — easy cancel. */
export function cancelOsaka30sDemo(): Osaka30sDemoProgress {
  const contextEventId = active?.contextEventId ?? null;
  if (active) {
    active.aborted = true;
  }

  if (contextEventId) {
    for (const op of listPreparedRealityOperations()) {
      if (op.contextEventId === contextEventId) {
        deletePreparedRealityOperation(op.operationId);
      }
    }
    deleteSessionGraph(contextEventId);
  }

  if (typeof window !== "undefined") {
    clearPlaceExploreSession();
    resetOsakaDemoTheaterState();
  }

  const cancelled: Osaka30sDemoProgress = {
    version: OSAKA_30S_DEMO_VERSION,
    contextEventId,
    stepId: null,
    stepIndex: -1,
    status: "error",
    replyKo: null,
    done: false,
    awaitingHuman: false,
    canRewind: false,
    errorKo: "cancelled",
  };
  emitProgress(cancelled);
  active = null;
  return cancelled;
}

/**
 * Rewind one completed step. From awaiting_approve → undo first_reserve.
 */
export function rewindOsaka30sDemo(): Osaka30sDemoProgress | null {
  if (!active || active.snapshots.length === 0) {
    return null;
  }

  // Drop current tip snapshot, restore previous (or empty if rewinding first).
  active.snapshots.pop();
  const previous = active.snapshots[active.snapshots.length - 1] ?? null;

  if (!previous) {
    if (active.contextEventId) {
      for (const op of listPreparedRealityOperations()) {
        if (op.contextEventId === active.contextEventId) {
          deletePreparedRealityOperation(op.operationId);
        }
      }
      deleteSessionGraph(active.contextEventId);
    }
    active.contextEventId = null;
    active.lastReply = null;
    if (typeof window !== "undefined") {
      resetOsakaDemoTheaterState();
    }
    const empty: Osaka30sDemoProgress = {
      version: OSAKA_30S_DEMO_VERSION,
      contextEventId: null,
      stepId: null,
      stepIndex: -1,
      status: "error",
      replyKo: null,
      done: false,
      awaitingHuman: false,
      canRewind: false,
      errorKo: "cancelled",
    };
    emitProgress(empty);
    active = null;
    return empty;
  }

  if (previous.graph) {
    writeSessionGraph(previous.graph);
    active.contextEventId = previous.graph.contextEventId;
  } else if (active.contextEventId) {
    deleteSessionGraph(active.contextEventId);
  }
  if (active.contextEventId) {
    restoreOps(active.contextEventId, previous.operations);
  }
  active.lastReply = previous.replyKo;

  syncTheater({
    stepId: previous.stepId,
    stepIndex: previous.stepIndex,
    prepCard: previous.prepCard,
    awaitingApprove: false,
    showCompareArcs: previous.stepIndex >= 1,
  });
  const restored: Osaka30sDemoProgress = {
    ...baseProgress(),
    stepId: previous.stepId,
    stepIndex: previous.stepIndex,
    status: "done",
    done: false,
    awaitingHuman: false,
    canRewind: active.snapshots.length > 0,
    errorKo: null,
  };
  emitProgress(restored);
  return restored;
}

export function isOsaka30sDemoActive(): boolean {
  return active != null && !active.aborted;
}

/**
 * After 뒤로, continue auto-play from the next step through awaiting_approve.
 */
export async function continueOsaka30sDemo(): Promise<Osaka30sDemoProgress | null> {
  if (!active || active.aborted || active.snapshots.length === 0) {
    return null;
  }
  const last = active.snapshots[active.snapshots.length - 1]!;
  const startIndex = last.stepIndex + 1;
  const autoSteps = OSAKA_30S_DEMO_STEPS.filter((step) => step.id !== "approve");
  if (startIndex >= autoSteps.length) {
    const approveIndex = OSAKA_30S_DEMO_STEPS.length - 1;
    const prep = active.contextEventId
      ? buildPrepCard(active.contextEventId)
      : null;
    active.lastReply = "승인하면 예약을 반영해요";
    syncTheater({
      stepId: "approve",
      stepIndex: approveIndex,
      prepCard: prep,
      awaitingApprove: true,
      showCompareArcs: true,
    });
    const awaiting: Osaka30sDemoProgress = {
      ...baseProgress(),
      stepId: "approve",
      stepIndex: approveIndex,
      status: "awaiting_approve",
      done: false,
      awaitingHuman: true,
      canRewind: true,
      errorKo: null,
    };
    emitProgress(awaiting);
    return awaiting;
  }

  try {
    for (let index = startIndex; index < autoSteps.length; index += 1) {
      if (active.aborted) {
        break;
      }
      const step = autoSteps[index]!;
      syncTheater({
        stepId: step.id,
        stepIndex: index,
        showCompareArcs: true,
      });
      emitProgress({
        ...baseProgress(),
        stepId: step.id,
        stepIndex: index,
        status: "running",
        done: false,
        awaitingHuman: false,
        canRewind: active.snapshots.length > 0,
        errorKo: null,
      });
      await executeStep(step.id, step.utterance);
      if (active.aborted) {
        break;
      }
      const prep =
        step.id === "first_reserve" && active.contextEventId
          ? buildPrepCard(active.contextEventId)
          : null;
      if (step.id === "first_reserve" && prep) {
        active.lastReply = "예약 준비 완료 · 승인만 누르면 끝나요";
      }
      pushSnapshot(index, step.id, prep);
      syncTheater({
        stepId: step.id,
        stepIndex: index,
        prepCard: prep,
        showCompareArcs: true,
      });
      emitProgress({
        ...baseProgress(),
        stepId: step.id,
        stepIndex: index,
        status: "done",
        done: false,
        awaitingHuman: false,
        canRewind: true,
        errorKo: null,
      });
      await sleep(active.delayMs, active);
    }

    if (active.aborted) {
      return cancelOsaka30sDemo();
    }

    const approveIndex = OSAKA_30S_DEMO_STEPS.length - 1;
    const prep = active.contextEventId
      ? buildPrepCard(active.contextEventId)
      : null;
    active.lastReply = "승인하면 예약을 반영해요";
    syncTheater({
      stepId: "approve",
      stepIndex: approveIndex,
      prepCard: prep,
      awaitingApprove: true,
      showCompareArcs: true,
    });
    const awaiting: Osaka30sDemoProgress = {
      ...baseProgress(),
      stepId: "approve",
      stepIndex: approveIndex,
      status: "awaiting_approve",
      done: false,
      awaitingHuman: true,
      canRewind: active.snapshots.length > 0,
      errorKo: null,
    };
    emitProgress(awaiting);
    return awaiting;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "demo_failed";
    const failed: Osaka30sDemoProgress = {
      ...baseProgress(),
      stepId: null,
      stepIndex: -1,
      status: "error",
      done: false,
      awaitingHuman: false,
      canRewind: false,
      errorKo: message,
    };
    emitProgress(failed);
    active = null;
    return failed;
  }
}
