/**
 * Browser coding-tool dispatch — never imports Node child_process / fs.
 */

import type {
  HubWorkspaceToolContext,
  HubWorkspaceToolId,
  HubWorkspaceToolResult,
} from "@/lib/hub/dev/hub-workspace-tools";

export async function invokeCodingToolBrowser(
  toolId: HubWorkspaceToolId,
  args: Record<string, unknown>,
  ctx: HubWorkspaceToolContext,
): Promise<HubWorkspaceToolResult> {
  try {
    const res = await fetch("/api/hub/dev/repo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toolId,
        args,
        platformId: ctx.getDraft().id,
        utterance: typeof args.utterance === "string" ? args.utterance : undefined,
      }),
    });
    const json = (await res.json()) as HubWorkspaceToolResult;
    if (!res.ok && !("ok" in json)) {
      return { ok: false, toolId, error: "repo api failed" };
    }
    return json;
  } catch (err) {
    return {
      ok: false,
      toolId,
      error: err instanceof Error ? err.message : "repo api failed",
    };
  }
}
