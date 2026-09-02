import { NextResponse } from "next/server";
import {
  ensureAgentPlatformHydrated,
  readPersistedGoalState,
  resumeGoalWorkLog,
  syncPersistedGoalState,
} from "@/lib/agent-platform";
import { isAgentPlatformSupabaseEnabled } from "@/lib/agent-platform/persistence/supabase-store";
import type { PersistedGoalState } from "@/lib/agent-platform/types";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ contextEventId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { contextEventId } = await context.params;
  const decoded = decodeURIComponent(contextEventId);
  await ensureAgentPlatformHydrated();
  const goal = readPersistedGoalState(decoded);
  return NextResponse.json({
    ok: true,
    goal,
    resumeWorkLogKo: resumeGoalWorkLog(decoded),
    hydrated: true,
    supabaseWriteThrough: isAgentPlatformSupabaseEnabled(),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { contextEventId } = await context.params;
  const decoded = decodeURIComponent(contextEventId);
  await ensureAgentPlatformHydrated();

  let body: Partial<PersistedGoalState>;
  try {
    body = (await request.json()) as Partial<PersistedGoalState>;
  } catch {
    return NextResponse.json({ ok: false, errorKo: "invalid_json" }, { status: 400 });
  }

  const prev = readPersistedGoalState(decoded);
  const goal = syncPersistedGoalState({
    contextEventId: decoded,
    goalKo: body.goalKo ?? prev?.goalKo ?? "Dev Hub 작업",
    goalId: body.goalId ?? prev?.goalId ?? `goal:${decoded}`,
    percent: body.percent ?? prev?.percent ?? 0,
    status: body.status ?? prev?.status ?? "active",
    pendingCapabilityIds: body.pendingCapabilityIds ?? prev?.pendingCapabilityIds ?? [],
    completedCapabilityIds: body.completedCapabilityIds ?? prev?.completedCapabilityIds ?? [],
    lastExecutionId: body.lastExecutionId ?? prev?.lastExecutionId ?? null,
    utterance: body.utterance ?? prev?.utterance ?? null,
    updatedAtIso: new Date().toISOString(),
    pipelineCapabilityIds: body.pipelineCapabilityIds ?? prev?.pipelineCapabilityIds,
    pipelineStepIndex: body.pipelineStepIndex ?? prev?.pipelineStepIndex,
    compositeLoopId: body.compositeLoopId ?? prev?.compositeLoopId ?? null,
  });

  return NextResponse.json({ ok: true, goal });
}
