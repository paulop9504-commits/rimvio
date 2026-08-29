import { NextResponse } from "next/server";
import type { VerifierResponsePersistRow } from "@/lib/reality-data-network/persist-tasks";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type ResponsesTable = {
  upsert: (
    values: VerifierResponsePersistRow[],
    options: { onConflict: string },
  ) => Promise<{ error: { message: string } | null }>;
};

export async function POST(request: Request) {
  let row: VerifierResponsePersistRow;
  try {
    row = (await request.json()) as VerifierResponsePersistRow;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, persisted: false, reason: "supabase_off" });
  }

  try {
    const supabase = await createClient();
    const table = supabase.from("verifier_responses") as unknown as ResponsesTable;
    const { error } = await table.upsert([row], { onConflict: "response_id" });
    if (error) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, responseId: row.response_id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: e instanceof Error ? e.message : "persist_failed" },
      { status: 500 },
    );
  }
}
