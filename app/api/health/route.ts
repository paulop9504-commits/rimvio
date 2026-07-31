import { NextResponse } from "next/server";
import { collectHealthReport } from "@/lib/server/health-check";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";
export const maxDuration = 30;
export const runtime = "nodejs";

export async function GET() {
  const report = await collectHealthReport();

  return NextResponse.json(report, {
    status: report.ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
