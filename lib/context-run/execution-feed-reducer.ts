import type {
  ExecutionFeedArtifactInput,
  ExecutionFeedGoalInput,
  ExecutionFeedItem,
  ExecutionFeedState,
  ExecutionFeedStepInput,
} from "@/lib/context-run/execution-feed-types";

function nowIso(): string {
  return new Date().toISOString();
}

function upsertPill(
  item: ExecutionFeedItem,
  input: ExecutionFeedStepInput,
): ExecutionFeedItem {
  const pills = [...item.pills];
  const index = pills.findIndex((pill) => pill.id === input.stepId);
  const next = {
    id: input.stepId,
    labelKo: input.labelKo,
    status: input.status,
    resultKo: input.resultKo ?? null,
  };
  if (index >= 0) {
    pills[index] = next;
  } else {
    pills.push(next);
  }

  const activePillId =
    input.status === "running" || input.status === "waiting_user"
      ? input.stepId
      : item.activePillId === input.stepId && input.status === "done"
        ? null
        : item.activePillId;

  return {
    ...item,
    pills,
    activePillId,
    expandedPillId:
      input.status === "running" || input.status === "waiting_user"
        ? input.stepId
        : input.status === "done"
          ? null
          : item.expandedPillId,
  };
}

export function reduceExecutionFeedGoal(
  state: ExecutionFeedState,
  input: ExecutionFeedGoalInput,
): ExecutionFeedState {
  const id = `run:${input.graphId}`;
  return {
    run: {
      id,
      graphId: input.graphId,
      createdAt: nowIso(),
      goalKo: input.goalKo,
      pills: [],
      activePillId: null,
      expandedPillId: null,
      artifact: null,
    },
  };
}

export function reduceExecutionFeedStep(
  state: ExecutionFeedState,
  input: ExecutionFeedStepInput,
): ExecutionFeedState {
  if (!state.run || state.run.graphId !== input.graphId) {
    return state;
  }
  const run = upsertPill(state.run, input);
  return { run };
}

export function reduceExecutionFeedArtifact(
  state: ExecutionFeedState,
  input: ExecutionFeedArtifactInput,
): ExecutionFeedState {
  if (!state.run || state.run.graphId !== input.graphId) {
    return state;
  }
  let run: ExecutionFeedItem = {
    ...state.run,
    artifact: input.artifact,
  };
  if (input.stepId) {
    run = upsertPill(run, {
      graphId: input.graphId,
      stepId: input.stepId,
      labelKo:
        run.pills.find((pill) => pill.id === input.stepId)?.labelKo ??
        input.artifact.titleKo ??
        "진행",
      status: input.artifact.kind === "question" ? "waiting_user" : "running",
    });
  }
  return { run };
}

export function reduceExecutionFeedTogglePill(
  state: ExecutionFeedState,
  pillId: string,
): ExecutionFeedState {
  if (!state.run) {
    return state;
  }
  const expandedPillId =
    state.run.expandedPillId === pillId ? null : pillId;
  return {
    run: {
      ...state.run,
      expandedPillId,
    },
  };
}

export function reduceExecutionFeedArtifactTab(
  state: ExecutionFeedState,
  tabId: string,
): ExecutionFeedState {
  if (!state.run?.artifact?.tabs?.length) {
    return state;
  }
  const allowed = state.run.artifact.tabs.some((tab) => tab.id === tabId);
  if (!allowed) {
    return state;
  }
  return {
    run: {
      ...state.run,
      artifact: {
        ...state.run.artifact,
        activeTabId: tabId,
      },
    },
  };
}

export function reduceExecutionFeedClear(): ExecutionFeedState {
  return { run: null };
}
