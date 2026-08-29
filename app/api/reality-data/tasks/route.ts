import { NextResponse } from "next/server";
import type { RealityTaskPersistRow } from "@/lib/reality-data-network/persist-tasks";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type TasksTable = {
  upsert: (
    values: RealityTaskPersistRow[],
    options: { onConflict: string },
  ) => Promise<{ error: { message: string } | null }>;
};

export async function POST(request: Request) {
  let row: RealityTaskPersistRow;
  try {
    row = (await request.json()) as RealityTaskPersistRow;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, persisted: false, reason: "supabase_off" });
  }

  try {
    const supabase = await createClient();
    const table = supabase.from("reality_tasks") as unknown as TasksTable;
    const { error } = await table.upsert([row], { onConflict: "task_id" });
    if (error) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, taskId: row.task_id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: e instanceof Error ? e.message : "persist_failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, rows: [], reason: "supabase_off" });
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("reality_tasks").select("*").limit(100);
    if (error) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: e instanceof Error ? e.message : "read_failed" },
      { status: 500 },
    );
  }
}
