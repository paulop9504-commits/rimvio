import { NextResponse } from "next/server";
import {
  isPcProgramId,
  programUrl,
  type PcProgramId,
} from "@/lib/pc-local-agent/program-install-catalog";

async function resolveCursorExeUrl(): Promise<string> {
  const configured = process.env.RIMVIO_CURSOR_SETUP_URL?.trim();
  if (configured && /\.exe(\?|$)/i.test(configured)) {
    return configured;
  }
  const res = await fetch(
    "https://cursor.com/api/download?platform=win32-x64-user&releaseTrack=stable",
    { cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error(`cursor_lookup_${res.status}`);
  }
  const data = (await res.json()) as { downloadUrl?: string };
  const url = data.downloadUrl?.trim() ?? "";
  if (!url || !/\.exe(\?|$)/i.test(url)) {
    throw new Error("cursor_lookup_invalid");
  }
  return url;
}

async function resolveRedirectUrl(id: PcProgramId): Promise<string> {
  if (id === "cursor") {
    return resolveCursorExeUrl();
  }
  return programUrl(id);
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!isPcProgramId(id)) {
    return NextResponse.json({ error: "unknown_program" }, { status: 400 });
  }
  try {
    const url = await resolveRedirectUrl(id);
    const res = NextResponse.redirect(url, 302);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch {
    return NextResponse.json({ error: "download_unavailable" }, { status: 502 });
  }
}
