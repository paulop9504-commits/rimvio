import { NextResponse } from "next/server";
import {
  compileIntentBlueprint,
  compileIntentBlueprintViaLlm,
} from "@/lib/intent-engine/compile-intent-blueprint";

type CompileBody = {
  text?: string;
  use_llm?: boolean;
  force_llm?: boolean;
};

/**
 * POST /api/intent-engine/compile
 * NL → IntentBlueprint. LLM slot filler only on regex miss (or force_llm).
 * Never executes Reality.
 */
export async function POST(request: Request) {
  let body: CompileBody;
  try {
    body = (await request.json()) as CompileBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  if (body.use_llm) {
    const result = await compileIntentBlueprintViaLlm({
      text,
      forceLlm: body.force_llm === true,
    });
    return NextResponse.json({
      blueprint: result.blueprint,
      source: result.source,
      wire: result.wire,
    });
  }

  return NextResponse.json({
    blueprint: compileIntentBlueprint({ text }),
    source: "rules",
    wire: null,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    layer: "intent-engine",
    pipeline: ["parse", "semantic", "compose", "conflict", "blueprint"],
    llm: "slot_filler_on_regex_miss",
  });
}
