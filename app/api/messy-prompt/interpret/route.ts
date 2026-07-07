import { NextResponse } from "next/server";
import { interpretMessyPrompt } from "@/lib/messy-prompt-interpreter/interpret-messy-prompt";
import type { InterpretAndExecuteResult } from "@/lib/messy-prompt-interpreter/types";

type InterpretBody = {
  message?: string;
  situation?: Record<string, string | number | boolean | null>;
  use_llm?: boolean;
};

/**
 * POST /api/messy-prompt/interpret
 * Client-safe messy NL → plan + visualization (LLM when configured).
 */
export async function POST(request: Request) {
  let body: InterpretBody;

  try {
    body = (await request.json()) as InterpretBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = body.message?.trim() ?? "";
  if (!message) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }

  const useLlm = body.use_llm !== false;
  const result: InterpretAndExecuteResult = await interpretMessyPrompt(message, {
    situation: body.situation,
    useLlm,
  });

  return NextResponse.json({
    result,
    source: result.source,
    layer: "messy-prompt-interpreter",
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    layer: "messy-prompt-interpreter",
    role: "messy NL → IR → plan (interpret-only)",
    methods: ["POST"],
  });
}
