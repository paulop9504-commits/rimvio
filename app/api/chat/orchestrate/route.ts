import { NextResponse } from "next/server";
import { orchestrateUserMessage } from "@/lib/action-chat/orchestrate-user-message";
import type { MasterContextApiPayload } from "@/lib/action-chat/client-master-context";
import { normalizeActiveChains } from "@/lib/containers/container-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
      linkTitle?: string | null;
      linkUrl?: string | null;
      linkCategory?: string | null;
      activeChains?: string[];
      linkedLinks?: Array<{
        id: string;
        title: string;
        url: string | null;
        category: string | null;
      }>;
      masterContext?: MasterContextApiPayload | null;
    };

    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "message_required" }, { status: 400 });
    }

    const masterContext = body.masterContext ?? null;
    if (body.activeChains?.length && masterContext) {
      masterContext.activeChains = normalizeActiveChains(body.activeChains);
    }

    const result = await orchestrateUserMessage({
      message,
      history: body.history,
      linkTitle: body.linkTitle,
      linkUrl: body.linkUrl,
      linkCategory: body.linkCategory,
      linkedLinks: body.linkedLinks,
      masterContext,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "orchestrate_failed" }, { status: 500 });
  }
}
