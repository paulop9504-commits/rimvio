/** Minimal capability catalog mirror for local agent routing. */

export type CapabilityTier = "builtin" | "installable" | "sensitive";

export type CapabilityDef = {
  id: string;
  name: string;
  tier: CapabilityTier;
  requires: string[];
};

export const BUILTIN_IDS = ["browser.basic"] as const;
export const DEMO_CAPABILITY_ID = "demo.module";
export const PDF_CAPABILITY_ID = "file.pdf";

const CATALOG: CapabilityDef[] = [
  { id: "browser.basic", name: "Browser Basic", tier: "builtin", requires: [] },
  { id: DEMO_CAPABILITY_ID, name: "Demo Module", tier: "installable", requires: ["browser.basic"] },
  { id: PDF_CAPABILITY_ID, name: "PDF Reader", tier: "installable", requires: [] },
];

const byId = new Map(CATALOG.map((c) => [c.id, c]));

export function expandDeps(ids: string[]): string[] {
  const resolved = new Set<string>();
  const queue = [...ids];
  while (queue.length) {
    const id = queue.shift()!;
    if (resolved.has(id)) continue;
    resolved.add(id);
    const def = byId.get(id);
    for (const req of def?.requires ?? []) {
      if (!resolved.has(req)) queue.push(req);
    }
  }
  return [...resolved];
}

export function defaultRequired(task: { type: string; payload: { requiredCapabilities?: string[] } }): string[] {
  if (task.payload.requiredCapabilities?.length) {
    return task.payload.requiredCapabilities;
  }
  if (task.type === "OPEN_URL") {
    return [...BUILTIN_IDS];
  }
  return [...BUILTIN_IDS];
}

export class CapabilityRouter {
  constructor(private installed: Set<string>) {}

  static withBuiltinOnly(): CapabilityRouter {
    return new CapabilityRouter(new Set(BUILTIN_IDS));
  }

  updateInstalled(ids: string[]): void {
    for (const id of ids) {
      this.installed.add(id);
    }
  }

  check(required: string[]): { ready: boolean; missing: string[] } {
    const expanded = expandDeps(required);
    const missing = expanded.filter((id) => !this.installed.has(id));
    return { ready: missing.length === 0, missing };
  }

  markInstalled(id: string): void {
    this.installed.add(id);
  }
}
