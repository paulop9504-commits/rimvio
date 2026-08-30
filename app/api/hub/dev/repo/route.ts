import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { readHubConnectionSecretForUser } from "@/lib/hub/dev/hub-connection-server-store";
import { invokeCodingTool } from "@/lib/hub/dev/coding-agent/invoke-coding-tools";
import { getRepoSession } from "@/lib/hub/dev/coding-agent/repo-session";
import type { HubWorkspaceToolContext, HubWorkspaceToolId } from "@/lib/hub/dev/hub-workspace-tools";
import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";
import { buildProjectSnapshot } from "@/lib/hub/dev/dev-project-state";

export async function POST(request: Request) {
  let body: {
    toolId?: string;
    args?: Record<string, unknown>;
    platformId?: string;
    utterance?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const toolId = body.toolId as HubWorkspaceToolId | undefined;
  if (!toolId) {
    return NextResponse.json({ error: "toolId_required" }, { status: 400 });
  }

  const platformId = body.platformId?.trim() || "dev";
  const args = { ...(body.args ?? {}) };
  if (body.utterance && !args.utterance) {
    args.utterance = body.utterance;
  }

  if (toolId === "repo.clone") {
    const userId = await getAuthUserId();
    const supabase = await tryCreateClient();
    if (userId && supabase) {
      const secret = await readHubConnectionSecretForUser(supabase, userId, "github");
      const token = secret && typeof secret.access_token === "string" ? secret.access_token : null;
      if (token) {
        args.accessToken = token;
      }
    }
  }

  const draft = createDefaultPlatformDraft();
  draft.id = platformId;

  const ctx: HubWorkspaceToolContext = {
    getDraft: () => draft,
    updateDraft: () => {},
    snapshot: buildProjectSnapshot({ draft }),
    executor: {
      mode: "platform",
      getDraft: () => draft,
      updateDraft: () => {},
      runSandboxTest: async () => ({ passed: true }),
      onPublishSuccess: () => {},
      onGoToStep: () => {},
    },
    connections: {},
    repoRoot: getRepoSession(platformId)?.root,
  };

  const result = await invokeCodingTool(toolId, args, ctx);

  if (result.ok && result.data && typeof result.data === "object") {
    const data = { ...(result.data as Record<string, unknown>) };
    delete data.accessToken;
    delete data.token;
    delete data.root;
    return NextResponse.json({ ...result, data });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
