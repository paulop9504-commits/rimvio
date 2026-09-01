import { NextResponse } from "next/server";
import type { CapabilityIndexEntry } from "@/lib/platform-sdk/capability-index";
import {
  publishCapabilityToRegistry,
  publishCatalogCapability,
  listRegistryEntries,
  ensureRegistryReady,
} from "@/lib/agent-platform";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { entry?: CapabilityIndexEntry; capabilityId?: string; platformId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, errorKo: "invalid_json" }, { status: 400 });
  }

  await ensureRegistryReady();

  if (body.entry) {
    const result = publishCapabilityToRegistry({ entry: body.entry });
    return NextResponse.json(result, { status: result.ok ? 201 : 422 });
  }

  const capabilityId = body.capabilityId?.trim();
  if (!capabilityId) {
    return NextResponse.json({ ok: false, errorKo: "entry_or_capabilityId_required" }, { status: 400 });
  }

  const result = publishCatalogCapability(capabilityId, body.platformId);
  return NextResponse.json(result, { status: result.ok ? 201 : 422 });
}

export async function GET() {
  await ensureRegistryReady();
  return NextResponse.json({ ok: true, entries: listRegistryEntries() });
}
