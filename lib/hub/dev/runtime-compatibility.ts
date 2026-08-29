import type { CapabilityAction } from "@/lib/hub/capability/types";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import {
  listPublishedRuntimes,
  readRuntimeIndex,
  type RuntimeIndexEntry,
  type RuntimeType,
} from "@/lib/hub/dev/runtime-registry";

export type RuntimeCompatibilityRow = {
  readonly runtime: RuntimeIndexEntry;
  readonly compatible: boolean;
  readonly reason: string;
};

function draftRuntimeType(draft: PlatformDraft): RuntimeType {
  const t = draft.runtime?.type;
  if (t === "pc-agent") return "pc";
  if (t === "cloud-agent") return "cloud";
  if (t === "mobile-agent") return "mobile";
  if (t === "remote-agent" || t === "api-tool") return "browser";
  if (draft.runtimeTier === "native") return "pc";
  return "cloud";
}

function capabilityRuntimeHints(action: CapabilityAction): RuntimeType[] {
  const name = action.name.toLowerCase();
  if (/vision|defect|camera|plc|sensor|industrial/.test(name)) {
    return ["industrial", "pc", "cloud"];
  }
  if (/payment|booking|hotel|market/.test(name)) {
    return ["cloud", "browser", "pc"];
  }
  return ["cloud", "browser", "pc", "mobile"];
}

export function resolveCompatibleRuntimesForCapability(input: {
  draft: PlatformDraft;
  action: CapabilityAction;
}): readonly RuntimeCompatibilityRow[] {
  const hints = new Set([
    draftRuntimeType(input.draft),
    ...capabilityRuntimeHints(input.action),
  ]);

  return readRuntimeIndex().map((runtime) => {
    const typeMatch = hints.has(runtime.type);
    const published =
      runtime.status === "published" || runtime.status === "certified";
    const interfaceOk = runtime.interfaces.includes("tool");

    const compatible = published && typeMatch && interfaceOk;
    let reason = "Incompatible";
    if (!published) reason = "Not published";
    else if (!interfaceOk) reason = "Missing Tool interface";
    else if (!typeMatch) reason = `Type mismatch (${runtime.type})`;
    else reason = runtime.tier === "core" ? "Core runtime" : "Extension · verified";

    return { runtime, compatible, reason };
  });
}

export function resolveCapabilitiesForRuntime(
  runtimeId: string,
  capabilityIds: readonly string[],
): readonly { capabilityId: string; compatible: boolean }[] {
  const runtime = readRuntimeIndex().find((r) => r.id === runtimeId);
  if (!runtime) return [];

  return capabilityIds.map((capabilityId) => {
    const lower = capabilityId.toLowerCase();
    const industrial = /vision|defect|plc|sensor|robot/.test(lower);
    const compatible =
      (runtime.status === "published" || runtime.status === "certified") &&
      (industrial
        ? runtime.type === "industrial" || runtime.supports.includes("plc")
        : runtime.type === "cloud" || runtime.type === "browser" || runtime.type === "pc");
    return { capabilityId, compatible };
  });
}

export function listCompatibleRuntimesForCapability(input: {
  draft: PlatformDraft;
  action: CapabilityAction;
}): readonly RuntimeIndexEntry[] {
  return resolveCompatibleRuntimesForCapability(input)
    .filter((r) => r.compatible)
    .map((r) => r.runtime);
}

export function countPublishedRuntimes(): number {
  return listPublishedRuntimes().length;
}
