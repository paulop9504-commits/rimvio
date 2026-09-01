import { NextResponse } from "next/server";
import {
  invokePublishedCapability,
  publishCapabilityToRegistry,
  publishCatalogCapability,
  ensureRegistryReady,
} from "@/lib/agent-platform";
import type { CapabilityIndexEntry } from "@/lib/platform-sdk/capability-index";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: {
    capabilityId?: string;
    entry?: CapabilityIndexEntry;
    publishOnly?: boolean;
    input?: Record<string, unknown>;
    userRequest?: string;
    contextEventId?: string;
    platformId?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, errorKo: "invalid_json" }, { status: 400 });
  }

  await ensureRegistryReady();

  if (body.entry) {
    const published = publishCapabilityToRegistry({ entry: body.entry });
    if (body.publishOnly) {
      return NextResponse.json(published);
    }
  } else if (body.capabilityId) {
    publishCatalogCapability(body.capabilityId, body.platformId);
  }

  const capabilityId = body.capabilityId?.trim() ?? body.entry?.capabilityId?.trim();
  if (!capabilityId || body.publishOnly) {
    return NextResponse.json({ ok: true, publishOnly: true });
  }

  const result = await invokePublishedCapability({
    capabilityId,
    input: body.input ?? {},
    userRequest: body.userRequest,
    contextEventId: body.contextEventId,
    platformId: body.platformId,
    syncGoal: true,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
