/**
 * Coding Agent sandbox — virtual workspace file store (P3).
 * No unrestricted filesystem access; paths must be in platform source map.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import {
  sourcePathsForCapability,
  buildPlatformSourceMap,
} from "@/lib/hub/dev/platform-agent/platform-source-map";

export type SandboxFile = {
  readonly path: string;
  readonly content: string;
  readonly language: "typescript" | "json" | "tsx";
};

const BLOCKED_PATTERNS = [
  /\.env/i,
  /secret/i,
  /credential/i,
  /\.\.\//,
  /^\/etc\//,
  /^c:\\/i,
];

const overlays = new Map<string, Map<string, string | null>>();

function overlayKey(draftId: string | undefined): string {
  return draftId?.trim() || "default";
}

export function isSandboxPathAllowed(path: string): boolean {
  const normalized = path.replace(/\\/g, "/").trim();
  if (!normalized || BLOCKED_PATTERNS.some((p) => p.test(normalized))) return false;
  return (
    normalized.startsWith("src/") ||
    normalized.startsWith("lib/") ||
    normalized.startsWith("app/") ||
    normalized.startsWith("components/") ||
    normalized.startsWith("scripts/") ||
    normalized.startsWith("tests/") ||
    normalized.endsWith(".json") ||
    normalized === "package.json"
  );
}

export function writeSandboxOverlay(input: {
  readonly draftId?: string;
  readonly path: string;
  readonly content: string;
}): { path: string; created: boolean } | null {
  if (!isSandboxPathAllowed(input.path)) return null;
  const bucket = overlays.get(overlayKey(input.draftId)) ?? new Map<string, string | null>();
  const created = !bucket.has(input.path) || bucket.get(input.path) == null;
  bucket.set(input.path.replace(/\\/g, "/"), input.content);
  overlays.set(overlayKey(input.draftId), bucket);
  return { path: input.path.replace(/\\/g, "/"), created };
}

export function deleteSandboxOverlay(input: {
  readonly draftId?: string;
  readonly path: string;
}): { path: string; deleted: boolean } | null {
  if (!isSandboxPathAllowed(input.path)) return null;
  const bucket = overlays.get(overlayKey(input.draftId)) ?? new Map<string, string | null>();
  const normalized = input.path.replace(/\\/g, "/");
  const existed = bucket.get(normalized) != null;
  bucket.set(normalized, null);
  overlays.set(overlayKey(input.draftId), bucket);
  return { path: normalized, deleted: existed };
}

export function transformSandboxOverlay(input: {
  readonly draftId?: string;
  readonly draft: PlatformDraft;
  readonly path: string;
  readonly find: string;
  readonly replace: string;
}): { path: string; changed: boolean } | null {
  const file = readSandboxFile({ draft: input.draft, path: input.path });
  if (!file || !input.find) return null;
  const next = file.content.split(input.find).join(input.replace);
  if (next === file.content) return { path: file.path, changed: false };
  writeSandboxOverlay({ draftId: input.draftId, path: file.path, content: next });
  return { path: file.path, changed: true };
}

function inferLanguage(path: string): SandboxFile["language"] {
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".json")) return "json";
  return "typescript";
}

function defaultContentForPath(path: string, draft: PlatformDraft): string {
  if (path.includes("capabilities/") && path.endsWith(".ts")) {
    const parts = path.replace("src/capabilities/", "").replace(".ts", "").split("/");
    const name = parts.join(".");
    const action = draft.actions.find((a) => a.name === name);
    return [
      `/** Capability: ${name} */`,
      `export async function invoke(input: Record<string, unknown>) {`,
      `  // ${action?.description ?? "Platform capability"}`,
      `  return { ok: true, capability: "${name}" };`,
      `}`,
    ].join("\n");
  }
  if (path.includes("schemas/") && path.endsWith(".schema.ts")) {
    return `export const schema = { type: "object", properties: {} };`;
  }
  if (path.includes("tests/")) {
    return `describe("sandbox", () => { it("passes", () => expect(true).toBe(true)); });`;
  }
  if (path.endsWith("manifest.json")) {
    return draft.manifestJson ?? "{}";
  }
  return `// ${path}\nexport {};`;
}

/** List virtual files derived from platform model + overlays. */
export function listSandboxFiles(draft: PlatformDraft): readonly SandboxFile[] {
  const map = buildPlatformSourceMap(draft);
  const paths = [...new Set(map.flatMap((r) => r.paths))];
  const files = paths.filter(isSandboxPathAllowed).map((path) => ({
    path,
    content: defaultContentForPath(path, draft),
    language: inferLanguage(path),
  }));
  const bucket = overlays.get(overlayKey(draft.id));
  if (!bucket) return files;
  const byPath = new Map(files.map((f) => [f.path, f]));
  for (const [path, content] of bucket) {
    if (content == null) {
      byPath.delete(path);
      continue;
    }
    byPath.set(path, { path, content, language: inferLanguage(path) });
  }
  return [...byPath.values()];
}

/** Read virtual file (partial — never full repo). */
export function readSandboxFile(input: {
  readonly draft: PlatformDraft;
  readonly path: string;
  readonly capability?: string;
}): SandboxFile | null {
  let path = input.path;
  if (input.capability && !path) {
    const paths = sourcePathsForCapability(input.draft, input.capability);
    path = paths[0] ?? "";
  }
  if (!path || !isSandboxPathAllowed(path)) return null;
  const overlay = overlays.get(overlayKey(input.draft.id))?.get(path.replace(/\\/g, "/"));
  if (overlay === null) return null;
  return {
    path,
    content: overlay ?? defaultContentForPath(path, input.draft),
    language: inferLanguage(path),
  };
}

/** Search virtual files by query (capability name, path fragment). */
export function searchSandboxFiles(input: {
  readonly draft: PlatformDraft;
  readonly query: string;
}): readonly SandboxFile[] {
  const q = input.query.toLowerCase();
  return listSandboxFiles(input.draft).filter(
    (f) => f.path.toLowerCase().includes(q) || f.content.toLowerCase().includes(q),
  );
}

/** Search symbols in virtual files. */
export function searchSandboxSymbols(input: {
  readonly draft: PlatformDraft;
  readonly symbol: string;
  readonly capability?: string;
}): readonly { readonly path: string; readonly symbol: string; readonly line: number }[] {
  const files = input.capability
    ? sourcePathsForCapability(input.draft, input.capability).map((path) =>
        readSandboxFile({ draft: input.draft, path }),
      ).filter(Boolean) as SandboxFile[]
    : searchSandboxFiles({ draft: input.draft, query: input.symbol });

  const sym = input.symbol.toLowerCase();
  const hits: { path: string; symbol: string; line: number }[] = [];
  for (const file of files) {
    const lines = file.content.split("\n");
    lines.forEach((line, i) => {
      if (line.toLowerCase().includes(sym) || line.includes(`function ${input.symbol}`)) {
        hits.push({ path: file.path, symbol: input.symbol, line: i + 1 });
      }
    });
  }
  return hits;
}

export type SandboxPatchResult = {
  readonly path: string;
  readonly content: string;
  readonly linesAdded: number;
  readonly linesRemoved: number;
};

/** Apply virtual patch — returns diff stats; platform draft sync is caller responsibility. */
export function patchSandboxFile(input: {
  readonly draft: PlatformDraft;
  readonly path?: string;
  readonly capability?: string;
  readonly sort?: string;
  readonly symbol?: string;
}): SandboxPatchResult | null {
  let path = input.path;
  if (input.capability && !path) {
    path = sourcePathsForCapability(input.draft, input.capability)[0];
  }
  if (!path || !isSandboxPathAllowed(path)) return null;

  const existing = readSandboxFile({ draft: input.draft, path })!;
  let content = existing.content;

  if (input.sort === "price" && path.includes("hotel")) {
    content = [
      existing.content,
      "",
      "// Agent: price sort",
      "export const defaultSort = 'price_asc';",
      "export function sortByPrice<T extends { priceKrw?: number }>(items: T[]): T[] {",
      "  return [...items].sort((a, b) => (a.priceKrw ?? 0) - (b.priceKrw ?? 0));",
      "}",
    ].join("\n");
  } else if (input.symbol || path.includes("booking") || path.includes("payment")) {
    content = [
      existing.content,
      "",
      `// Agent patch: ${input.symbol ?? "error handling"}`,
      "export function handleCancelError(err: unknown) {",
      "  if (err instanceof Error) return { ok: false, message: err.message };",
      "  return { ok: false, message: 'cancel failed' };",
      "}",
    ].join("\n");
  } else {
    content = `${existing.content}\n// Agent patch applied`;
  }

  const oldLines = existing.content.split("\n").length;
  const newLines = content.split("\n").length;

  return {
    path,
    content,
    linesAdded: Math.max(0, newLines - oldLines),
    linesRemoved: 0,
  };
}

export type MinimalPatchInput = {
  readonly path: string;
  readonly insertAfter?: string;
  readonly insertLines: readonly string[];
  readonly replacePattern?: RegExp;
  readonly replaceWith?: string;
};

/** Capability #60 — Minimal patch: smallest diff for a single change intent. */
export function buildMinimalPatch(input: MinimalPatchInput & { readonly existingContent: string }): string {
  const lines = input.existingContent.split("\n");
  if (input.replacePattern && input.replaceWith !== undefined) {
    return input.existingContent.replace(input.replacePattern, input.replaceWith);
  }
  if (input.insertAfter) {
    const idx = lines.findIndex((l) => l.includes(input.insertAfter!));
    if (idx >= 0) {
      const next = [...lines];
      next.splice(idx + 1, 0, ...input.insertLines);
      return next.join("\n");
    }
  }
  return [...lines, ...input.insertLines].join("\n");
}

export type MultiFilePatchSpec = {
  readonly path?: string;
  readonly capability?: string;
  readonly sort?: string;
  readonly symbol?: string;
};

export type MultiFilePatchResult = {
  readonly patches: readonly SandboxPatchResult[];
  readonly totalLinesAdded: number;
};

/** Capability #54 — Apply coordinated patches across multiple sandbox files. */
export function patchSandboxFiles(input: {
  readonly draft: PlatformDraft;
  readonly specs: readonly MultiFilePatchSpec[];
}): MultiFilePatchResult {
  const patches: SandboxPatchResult[] = [];
  for (const spec of input.specs) {
    const result = patchSandboxFile({ draft: input.draft, ...spec });
    if (result) patches.push(result);
  }
  return {
    patches,
    totalLinesAdded: patches.reduce((sum, p) => sum + p.linesAdded, 0),
  };
}

/** Minimal multi-file patch for a capability + its schema. */
export function patchCapabilityBundle(input: {
  readonly draft: PlatformDraft;
  readonly capability: string;
  readonly sort?: string;
}): MultiFilePatchResult {
  const capPath = sourcePathsForCapability(input.draft, input.capability)[0];
  const schemaPath = `src/schemas/${input.capability.replace(/\./g, "_")}.schema.ts`;
  const specs: MultiFilePatchSpec[] = [{ capability: input.capability, path: capPath, sort: input.sort }];
  if (isSandboxPathAllowed(schemaPath)) {
    specs.push({ path: schemaPath });
  }
  return patchSandboxFiles({ draft: input.draft, specs });
}
