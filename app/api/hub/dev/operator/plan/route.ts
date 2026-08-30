import { NextResponse } from "next/server";
import { planOperatorTurnWithLlm } from "@/lib/hub/dev/operator-llm-planner";

export async function POST(request: Request) {
  let body: {
    utterance?: string;
    inspect?: { platformName?: string; capabilities?: string[] };
    memory?: {
      currentGoal?: string | null;
      lastFiles?: string[];
      lastCapabilities?: string[];
      lastSymbols?: string[];
    } | null;
    repoReady?: boolean;
    modelId?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const utterance = body.utterance?.trim();
  if (!utterance) {
    return NextResponse.json({ error: "utterance_required" }, { status: 400 });
  }

  const plan = await planOperatorTurnWithLlm({
    utterance,
    inspect: {
      platformName: body.inspect?.platformName ?? "Platform",
      capabilities: body.inspect?.capabilities ?? [],
    },
    memory: body.memory
      ? {
          platformId: "api",
          currentGoal: body.memory.currentGoal ?? null,
          currentTask: null,
          lastUtterance: utterance,
          lastFiles: body.memory.lastFiles ?? [],
          lastCapabilities: body.memory.lastCapabilities ?? [],
          lastSymbols: body.memory.lastSymbols ?? [],
          lastObjects: [],
          history: [],
          workInProgress: true,
        }
      : null,
    repoReady: body.repoReady ?? false,
    modelId: body.modelId,
  });

  if (!plan) {
    return NextResponse.json({ error: "llm_unavailable", source: "fallback" }, { status: 503 });
  }

  return NextResponse.json(plan);
}
