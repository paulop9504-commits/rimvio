/**
 * Context Turn Runner — the single entry point for every user input.
 *
 * Flow:
 *   ① Active Context Resolver — find current context
 *   ② Intent Classifier — patch / execute / query / create / switch
 *   ③ Context Patch Engine — extract slot changes
 *   ④ Dependency Graph — find affected tasks
 *   ⑤ Recompute — re-execute only affected tasks
 *
 * User never needs to say "이 맥락에 이어서".
 */

import { getActiveContext, lockContext, updateActiveSlots, type ActiveContext } from "@/lib/context-patch/active-context-resolver";
import { classifyTurnIntent, type TurnIntent, type TurnIntentResult } from "@/lib/context-patch/classify-turn-intent";
import { extractPatches, type PatchResult } from "@/lib/context-patch/context-patch-engine";
import { resolveAffectedTasks, type AffectedTask } from "@/lib/context-patch/dependency-graph";
import { recomputeAffectedTasks, type RecomputeResult, type TaskExecutor } from "@/lib/context-patch/recompute-engine";

export type ContextTurnInput = {
  readonly utterance: string;
  readonly contextIdHint?: string;
};

export type ContextTurnResult = {
  readonly utterance: string;
  readonly intent: TurnIntentResult;
  readonly activeContext: ActiveContext | null;
  readonly patchResult: PatchResult | null;
  readonly affectedTasks: readonly AffectedTask[];
  readonly recomputeResult: RecomputeResult | null;
  readonly responseKo: string;
};

export async function runContextTurn(
  input: ContextTurnInput,
  taskExecutor: TaskExecutor,
  onCreateContext?: (utterance: string) => ActiveContext,
): Promise<ContextTurnResult> {
  const { utterance } = input;

  // ① Resolve active context
  let ctx = getActiveContext();
  const hasActive = ctx !== null;

  // ② Classify intent
  const intent = classifyTurnIntent(utterance, hasActive);

  // Handle CREATE
  if (intent.intent === "create") {
    if (onCreateContext) {
      ctx = onCreateContext(utterance);
      lockContext(ctx);
    }
    return {
      utterance,
      intent,
      activeContext: ctx,
      patchResult: null,
      affectedTasks: [],
      recomputeResult: null,
      responseKo: ctx
        ? `${ctx.label} 맥락을 생성했습니다.`
        : "새 맥락을 생성할 수 없습니다.",
    };
  }

  // Handle SWITCH (simplified — would look up context store)
  if (intent.intent === "switch") {
    return {
      utterance,
      intent,
      activeContext: ctx,
      patchResult: null,
      affectedTasks: [],
      recomputeResult: null,
      responseKo: "맥락 전환을 준비합니다.",
    };
  }

  // Handle QUERY (no mutation)
  if (intent.intent === "query") {
    return {
      utterance,
      intent,
      activeContext: ctx,
      patchResult: null,
      affectedTasks: [],
      recomputeResult: null,
      responseKo: "질문을 처리합니다.",
    };
  }

  // Must have active context for PATCH and EXECUTE
  if (!ctx) {
    return {
      utterance,
      intent,
      activeContext: null,
      patchResult: null,
      affectedTasks: [],
      recomputeResult: null,
      responseKo: "활성 맥락이 없습니다. 먼저 작업을 시작하세요.",
    };
  }

  // ③ Extract patches
  const patchResult = extractPatches(utterance, ctx.slots);

  // Apply patches to active context
  if (patchResult.patches.length > 0) {
    ctx = updateActiveSlots(patchResult.newSlots)!;
  }

  // ④ Dependency graph
  const changedKeys = patchResult.patches.map((p) => p.key);
  const affectedTasks = resolveAffectedTasks(changedKeys);

  // ⑤ Recompute
  let recomputeResult: RecomputeResult | null = null;
  if (affectedTasks.length > 0) {
    recomputeResult = await recomputeAffectedTasks(
      affectedTasks,
      ctx.slots,
      taskExecutor,
    );
  }

  // Build response
  const responseKo = recomputeResult
    ? recomputeResult.summaryKo
    : patchResult.patches.length > 0
      ? `${patchResult.summary} — 영향받는 작업 없음.`
      : intent.intent === "execute"
        ? "작업을 실행합니다."
        : "변경 사항 없음.";

  return {
    utterance,
    intent,
    activeContext: ctx,
    patchResult,
    affectedTasks,
    recomputeResult,
    responseKo,
  };
}
