import { NextResponse } from "next/server";
import {
  RIMVIO_PC_SETUP_FILENAME,
  resolvePcSetupDownloadUrl,
} from "@/lib/pc-local-agent/setup-url";

export async function GET() {
  const url = resolvePcSetupDownloadUrl();
  return NextResponse.json({
    available: Boolean(url),
    url,
    filename: RIMVIO_PC_SETUP_FILENAME,
  });
}
