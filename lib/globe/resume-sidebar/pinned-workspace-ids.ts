/**
 * User-pinned Workspace Capsules for Globe Resume sidebar.
 * Friends are never stored here.
 */

const STORAGE_KEY = "rimvio-resume-pinned-workspaces";
const memory = new Set<string>();

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readAll(): string[] {
  const store = storage();
  if (!store) return [...memory];
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [...memory];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...memory];
    const ids = parsed
      .filter((x): x is string => typeof x === "string" && Boolean(x.trim()))
      .map((x) => x.trim());
    memory.clear();
    for (const id of ids) memory.add(id);
    return ids;
  } catch {
    return [...memory];
  }
}

function writeAll(ids: readonly string[]): void {
  memory.clear();
  for (const id of ids) memory.add(id);
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function listPinnedWorkspaceIds(): readonly string[] {
  return readAll();
}

export function pinWorkspaceId(contextEventId: string): void {
  const key = contextEventId.trim();
  if (!key) return;
  writeAll([key, ...readAll().filter((id) => id !== key)].slice(0, 12));
}

export function unpinWorkspaceId(contextEventId: string): void {
  const key = contextEventId.trim();
  if (!key) return;
  writeAll(readAll().filter((id) => id !== key));
}
