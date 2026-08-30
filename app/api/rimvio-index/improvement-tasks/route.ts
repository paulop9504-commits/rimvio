import { NextResponse } from "next/server";
import { readImprovementTasks } from "@/lib/rimvio-index/improvement-task-pool";

export async function GET() {
  return NextResponse.json({ ok: true, tasks: readImprovementTasks() });
}
