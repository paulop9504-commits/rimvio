const UNIFIED_KEY = "rimvio.notification.dismissed";
const LEGACY_LOCATION_KEY = "rimvio.globe-inbox-dismissed-locations";
const LEGACY_STACK_PREP_KEY = "rimvio.bridge-stack-prep.dismissed";

function readJsonStringArray(key: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((row): row is string => typeof row === "string")
      : [];
  } catch {
    return [];
  }
}

function writeJsonStringArray(key: string, ids: readonly string[]) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

/** Merged dismiss set — unified + legacy inbox keys. */
export function readDismissedNotificationIds(): Set<string> {
  const out = new Set(readJsonStringArray(UNIFIED_KEY));

  for (const eventId of readJsonStringArray(LEGACY_LOCATION_KEY)) {
    out.add(`location:${eventId.trim()}`);
  }
  for (const id of readJsonStringArray(LEGACY_STACK_PREP_KEY)) {
    out.add(id.trim());
  }

  return out;
}

export function writeDismissedNotificationIds(ids: ReadonlySet<string>) {
  writeJsonStringArray(UNIFIED_KEY, [...ids]);
}

export function readDismissedLocationEventIds(): string[] {
  const out = new Set<string>();
  for (const id of readDismissedNotificationIds()) {
    if (id.startsWith("location:")) {
      const eventId = id.slice("location:".length).trim();
      if (eventId) {
        out.add(eventId);
      }
    }
  }
  return [...out];
}

/** Persist dismiss — mirrors into legacy keys where needed. */
export function persistNotificationDismiss(id: string): void {
  const key = id.trim();
  if (!key) {
    return;
  }

  const next = readDismissedNotificationIds();
  next.add(key);
  writeDismissedNotificationIds(next);

  if (key.startsWith("location:")) {
    const eventId = key.slice("location:".length).trim();
    if (eventId) {
      const legacy = new Set(readJsonStringArray(LEGACY_LOCATION_KEY));
      legacy.add(eventId);
      writeJsonStringArray(LEGACY_LOCATION_KEY, [...legacy]);
    }
    return;
  }

  if (key.startsWith("bridge_invite:")) {
    return;
  }

  const legacyStack = new Set(readJsonStringArray(LEGACY_STACK_PREP_KEY));
  legacyStack.add(key);
  writeJsonStringArray(LEGACY_STACK_PREP_KEY, [...legacyStack]);
}

export function resetNotificationStoreForTests(ids: readonly string[] = []) {
  writeJsonStringArray(UNIFIED_KEY, ids);
  writeJsonStringArray(LEGACY_LOCATION_KEY, []);
  writeJsonStringArray(LEGACY_STACK_PREP_KEY, []);
}
