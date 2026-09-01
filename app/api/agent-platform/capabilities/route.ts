import { NextResponse } from "next/server";
import {
  catalogSize,
  listRegistryEntries,
  searchRegistry,
  ensureRegistryReady,
  listRunnableCapabilities,
} from "@/lib/agent-platform";

export const runtime = "nodejs";

export async function GET(request: Request) {
  await ensureRegistryReady();
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const entries = query ? searchRegistry(query) : listRegistryEntries();
  return NextResponse.json({
    ok: true,
    catalogSize: catalogSize(),
    runnableSize: listRunnableCapabilities().length,
    registrySize: entries.length,
    query: query || null,
    capabilities: entries,
  });
}
