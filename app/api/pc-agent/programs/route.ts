import { NextResponse } from "next/server";
import {
  listAllProgramInstallOffers,
  programClientDownloadPath,
  resolveProgramInstallOffers,
} from "@/lib/pc-local-agent/program-install-catalog";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const programs = (q ? resolveProgramInstallOffers(q) : listAllProgramInstallOffers()).map(
    (program) => ({
      ...program,
      url: programClientDownloadPath(program.id),
    }),
  );
  return NextResponse.json({
    available: programs.length > 0,
    programs,
  });
}
