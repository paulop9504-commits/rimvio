import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { PersistRow } from "@/lib/capability-ledger/persist-execution";

type ExecutionsTable = {
  upsert: (
    values: PersistRow[],
    options: { onConflict: string },
  ) => Promise<{ error: { message: string } | null }>;
  select: (columns?: string) => Promise<{
    data: PersistRow[] | null;
    error: { message: string } | null;
  }>;
};

function executionsTable(supabase: Awaited<ReturnType<typeof createClient>>): ExecutionsTable {
  return supabase.from("capability_executions") as unknown as ExecutionsTable;
}

export async function POST(request: Request) {
  let row: PersistRow;
  try {
    row = (await request.json()) as PersistRow;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  if (!row.execution_id || !row.capability_id || !row.developer_id) {
    return NextResponse.json({ ok: false, reason: "missing_fields" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, persisted: false, reason: "supabase_off" });
  }

  try {
    const supabase = await createClient();
    const { error } = await executionsTable(supabase).upsert([row], {
      onConflict: "execution_id",
    });
    if (error) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, persisted: true, executionId: row.execution_id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "persist_failed";
    return NextResponse.json({ ok: false, reason: message }, { status: 500 });
  }
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, rows: [], reason: "supabase_off" });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await executionsTable(supabase).select("*");
    if (error) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "read_failed";
    return NextResponse.json({ ok: false, reason: message }, { status: 500 });
  }
}
