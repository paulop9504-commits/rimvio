/**
 * P9 — Platform ↔ source bidirectional sync.
 * Virtual source files ↔ PlatformDraft mutations.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { CapabilityAction } from "@/lib/hub/capability/types";
import {
  buildPlatformSourceMap,
  type PlatformSourceRef,
} from "@/lib/hub/dev/platform-agent/platform-source-map";
import { syncPlatformManifestJson } from "@/lib/hub/dev/capability-inspector";

export type SourceFileEntry = {
  readonly path: string;
  readonly content: string;
  readonly kind: PlatformSourceRef["kind"];
  readonly objectId: string;
};

export type SourceSyncConflict = {
  readonly path: string;
  readonly reasonKo: string;
};

export type BidirectionalSyncResult = {
  readonly draft: PlatformDraft;
  readonly files: readonly SourceFileEntry[];
  readonly conflicts: readonly SourceSyncConflict[];
  readonly syncedPaths: readonly string[];
};

function capFromPath(path: string): string | null {
  const capMatch = /src\/capabilities\/(.+)\.ts$/.exec(path);
  if (capMatch?.[1]) return capMatch[1].replace(/\//g, ".");
  const schemaMatch = /src\/schemas\/(.+)\.schema\.ts$/.exec(path);
  if (schemaMatch?.[1]) return schemaMatch[1].replace(/_/g, ".");
  return null;
}

function schemaContent(action: CapabilityAction): string {
  return JSON.stringify(
    {
      input: action.inputSchema,
      output: action.outputSchema,
      approvalRequired: action.approvalRequired,
    },
    null,
    2,
  );
}

function capabilityContent(action: CapabilityAction): string {
  return `/** Auto-generated from PlatformDraft */\nexport const capability = ${JSON.stringify(
    { id: action.name, description: action.description },
    null,
    2,
  )};\n`;
}

/** Export PlatformDraft → virtual source file map. */
export function exportDraftToSourceFiles(draft: PlatformDraft): SourceFileEntry[] {
  const files: SourceFileEntry[] = [];
  const map = buildPlatformSourceMap(draft);

  for (const ref of map) {
    if (ref.kind === "capability") {
      const action = draft.actions.find((a) => a.name === ref.id);
      if (!action) continue;
      for (const path of ref.paths) {
        files.push({
          path,
          content: path.includes("/schemas/")
            ? schemaContent(action)
            : capabilityContent(action),
          kind: ref.kind,
          objectId: ref.id,
        });
      }
    } else if (ref.kind === "workflow" && draft.workflowDescription) {
      for (const path of ref.paths) {
        files.push({
          path,
          content: `export const workflow = ${JSON.stringify({ description: draft.workflowDescription }, null, 2)};\n`,
          kind: ref.kind,
          objectId: ref.id,
        });
      }
    }
  }

  files.push({
    path: "rimvio.platform.manifest.json",
    content: draft.manifestJson || syncPlatformManifestJson(draft),
    kind: "capability",
    objectId: draft.id,
  });

  return files;
}

/** Apply a source file edit back into PlatformDraft. */
export function applySourcePatchToDraft(
  draft: PlatformDraft,
  path: string,
  content: string,
): { readonly patch: Partial<PlatformDraft>; readonly ok: boolean; readonly errorKo?: string } {
  if (path === "rimvio.platform.manifest.json") {
    return { patch: { manifestJson: content }, ok: true };
  }

  const capId = capFromPath(path);
  if (!capId) {
    return { ok: false, patch: {}, errorKo: `Unknown source path: ${path}` };
  }

  const action = draft.actions.find((a) => a.name === capId);
  if (!action) {
    return { ok: false, patch: {}, errorKo: `Capability not in draft: ${capId}` };
  }

  if (path.includes("/schemas/")) {
    try {
      const parsed = JSON.parse(content) as {
        input?: string;
        output?: string;
        approvalRequired?: boolean;
      };
      const actions = draft.actions.map((a) =>
        a.name === capId
          ? {
              ...a,
              inputSchema: parsed.input ?? a.inputSchema,
              outputSchema: parsed.output ?? a.outputSchema,
              approvalRequired: parsed.approvalRequired ?? a.approvalRequired,
            }
          : a,
      );
      return { patch: { actions }, ok: true };
    } catch {
      return { ok: false, patch: {}, errorKo: "Invalid schema JSON" };
    }
  }

  return { patch: {}, ok: true };
}

/** Bidirectional sync: draft → files, merge inbound file overrides. */
export function syncPlatformBidirectional(input: {
  readonly draft: PlatformDraft;
  readonly inboundFiles?: readonly SourceFileEntry[];
}): BidirectionalSyncResult {
  const exported = exportDraftToSourceFiles(input.draft);
  const fileMap = new Map(exported.map((f) => [f.path, f]));
  const conflicts: SourceSyncConflict[] = [];
  const syncedPaths: string[] = [];
  let draft = input.draft;

  for (const inbound of input.inboundFiles ?? []) {
    const existing = fileMap.get(inbound.path);
    if (existing && existing.content !== inbound.content) {
      const applied = applySourcePatchToDraft(draft, inbound.path, inbound.content);
      if (applied.ok) {
        draft = { ...draft, ...applied.patch };
        syncedPaths.push(inbound.path);
        fileMap.set(inbound.path, inbound);
      } else {
        conflicts.push({ path: inbound.path, reasonKo: applied.errorKo ?? "sync failed" });
      }
    } else if (!existing) {
      const applied = applySourcePatchToDraft(draft, inbound.path, inbound.content);
      if (applied.ok) {
        draft = { ...draft, ...applied.patch };
        syncedPaths.push(inbound.path);
        fileMap.set(inbound.path, inbound);
      }
    }
  }

  const files = exportDraftToSourceFiles(draft);
  return { draft, files, conflicts, syncedPaths };
}
