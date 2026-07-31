import { NextResponse } from "next/server";

/**
 * Korea-edge warm ping — keeps Fluid instance near icn1 ready for Workspace.
 * Cheap GET; safe to call once on app shell load.
 */
export const runtime = "nodejs";
export const preferredRegion = "icn1";
export const maxDuration = 10;
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      regionHint: "icn1",
      warmedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
